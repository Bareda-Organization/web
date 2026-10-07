import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { getDashboard } from "../api/dashboard";
import type { DashboardResponseTypes } from "../types/dashboard";
import { DASHBOARD_POLL_MS } from "../lib/useDashboard";
import { DashboardPage } from "./DashboardPage";

vi.mock("../api/dashboard", () => ({ getDashboard: vi.fn() }));
const mockGetDashboard = vi.mocked(getDashboard);

const makeDashboard = (patch: Partial<DashboardResponseTypes> = {}): DashboardResponseTypes => ({
  asOf: "2026-10-03T12:45:00+09:00",
  period: { from: "2026-09-27", to: "2026-10-03", days: 7 },
  runs: { count: 55, previousCount: 53, canceledCount: 1 },
  onTime: { rate: 0.91, onTimeCount: 41, startedCount: 45, targetRate: 0.9 },
  delays: { count: 6, todayCount: 1, peak: { date: "2026-09-29", count: 2 } },
  changeRequests: { approved: 65, rejected: 10, autoRejected: 4, total: 79 },
  logins: { success: 215, fail: 8, todaySuccess: 82, yesterdaySuccess: 39, blocks: 1, blocksReleased: 1 },
  daily: ["27", "28", "29", "30"].map((day, index) => ({ date: `2026-09-${day}`, runCount: 8, delayCount: index, loginSuccess: 30, loginFail: index })).concat(
    ["01", "02", "03"].map((day) => ({ date: `2026-10-${day}`, runCount: 8, delayCount: 1, loginSuccess: 30, loginFail: 0 })),
  ),
  academies: [
    { academyId: "10", academyName: "하늘수학", runCount: 41, onTimeRate: 0.88, delayCount: 5, emergencyCount: 2, changeRequestCount: 61 },
    { academyId: "11", academyName: "새봄영어", runCount: 14, onTimeRate: null, delayCount: 1, emergencyCount: 1, changeRequestCount: 18 },
  ],
  attention: {
    signupBlocked: [{ requestId: "5", name: "민창민", academyName: "새봄영어", requestedAt: "2026-10-02T09:00:00+09:00" }],
    delayedRuns: [{ runId: "2", academyName: "하늘수학", busNo: "2호차", direction: "to_academy", delayMinutes: 10 }],
    expiringChangeRequests: [{ runId: "3", academyName: "하늘수학", busNo: "3호차", direction: "to_academy", deadlineAt: "2026-10-03T12:41:00+09:00", count: 3 }],
    unackedEmergencies: 0,
    staleRuns: 0,
    confirmFailedRuns: 0,
    blockedAccounts: 0,
  },
  todayRuns: [
    {
      runId: "2",
      academyId: "10",
      academyName: "하늘수학",
      busNo: "2호차",
      direction: "to_academy",
      departTime: "2026-10-03T12:20:00+09:00",
      estArrivalTime: null,
      runStatus: "moving",
      startedAt: "2026-10-03T12:20:00+09:00",
      finishedAt: null,
      delayMinutes: 10,
      stopsDone: 3,
      stopsTotal: 10,
      pendingChangeCount: 0,
      driverAssigned: true,
    },
  ],
  health: [
    { key: "api", status: "ok", detail: null },
    { key: "position", status: "warn", detail: "위치 끊김 1대" },
  ],
  recentEvents: [],
  ...patch,
});

// 첫 조회를 끝까지 흘린다 — 가짜 시계 아래라 waitFor 대신 act 로 마이크로태스크를 비운다.
const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetDashboard.mockResolvedValue(makeDashboard());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("처음에는 7일 · 전체 학원으로 읽고, 불러오는 동안 뼈대와 '불러오는 중…' 을 보인다", async () => {
    render(<DashboardPage />);

    expect(mockGetDashboard).toHaveBeenCalledWith(7, undefined);
    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중…");
    await flush();
    expect(screen.getByText("12:45 기준 · 30초마다 갱신")).toBeInTheDocument();
  });

  it("기간 칩을 누르면 days 가, 학원 칩을 누르면 academy_id 가 요청에 실린다", async () => {
    render(<DashboardPage />);
    await flush();

    fireEvent.click(screen.getByRole("tab", { name: "오늘" }));
    await flush();
    expect(mockGetDashboard).toHaveBeenLastCalledWith(1, undefined);

    fireEvent.click(screen.getByRole("tab", { name: "새봄영어" }));
    await flush();
    expect(mockGetDashboard).toHaveBeenLastCalledWith(1, "11");

    fireEvent.click(screen.getByRole("tab", { name: "전체" }));
    await flush();
    expect(mockGetDashboard).toHaveBeenLastCalledWith(1, undefined);
  });

  // Ruling 433 — 갱신이 실패해도 마지막으로 받은 값을 지우지 않는다.
  it("30초 갱신이 실패하면 이전 숫자를 그대로 두고 오류 띠 + 다시 시도를 보인다", async () => {
    render(<DashboardPage />);
    await flush();
    expect(screen.getByText("215")).toBeInTheDocument();

    mockGetDashboard.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 오류"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DASHBOARD_POLL_MS);
    });

    expect(screen.getByText("215")).toBeInTheDocument();
    expect(screen.getByText("최신 데이터를 받지 못했습니다 — 12:45 에 받은 내용을 보고 있습니다")).toBeInTheDocument();
    expect(screen.getByText("12:45 기준 · 갱신 실패")).toBeInTheDocument();

    mockGetDashboard.mockResolvedValue(makeDashboard());
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await flush();
    expect(screen.queryByText(/최신 데이터를 받지 못했습니다/)).not.toBeInTheDocument();
    expect(screen.getByText("12:45 기준 · 30초마다 갱신")).toBeInTheDocument();
  });

  it("처음부터 못 받았으면 숫자 대신 오류 상태와 다시 시도를 보인다", async () => {
    mockGetDashboard.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 오류"));
    render(<DashboardPage />);
    await flush();

    expect(screen.getByText("대시보드를 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryByText("215")).not.toBeInTheDocument();
  });

  it("조건을 바꾸면 이전 조건의 숫자를 새 조건의 것처럼 보이지 않는다", async () => {
    render(<DashboardPage />);
    await flush();

    mockGetDashboard.mockReturnValue(new Promise(() => undefined));
    fireEvent.click(screen.getByRole("tab", { name: "30일" }));
    await flush();

    expect(screen.queryByText("215")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중…");
  });

  it("정시 출발률이 null 이면 —, 도착 예정이 null 인 이동 중 회차의 진행률도 —", async () => {
    mockGetDashboard.mockResolvedValue(makeDashboard({ onTime: { rate: null, onTimeCount: 0, startedCount: 0, targetRate: 0.9 } }));
    render(<DashboardPage />);
    await flush();

    const onTimeCell = screen.getByText("정시 출발률").parentElement as HTMLElement;
    expect(within(onTimeCell).getByText("—")).toBeInTheDocument();
    const row = screen.getByText("2호차 · 등원").closest("tr") as HTMLElement;
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).getByText("10분 지연")).toBeInTheDocument();
  });

  it("지금 처리할 것의 각 줄은 해당 화면으로 이동하는 링크다", async () => {
    render(<DashboardPage />);
    await flush();

    expect(screen.getByRole("link", { name: "가입 승인" })).toHaveAttribute("href", "/member-approvals");
    expect(screen.getByRole("link", { name: "운행 지연" })).toHaveAttribute("href", "/monitoring");
    expect(screen.getByRole("link", { name: "변경 요청 · 자동 거절 임박" })).toHaveAttribute("href", "/monitoring");
    expect(screen.getByText("민창민 · 새봄영어 — 정원 찼음 · 2일째")).toBeInTheDocument();
  });

  // R50 M5 — §6.18 `change_requests` 는 고른 기간에 결정된 건수다. "누적" 이 아니라 그 기간을 적는다.
  it("처리 결과 건수는 '누적' 이 아니라 고른 기간으로 적는다", async () => {
    mockGetDashboard.mockResolvedValue(makeDashboard({ period: { from: "2026-10-03", to: "2026-10-03", days: 1 } }));
    render(<DashboardPage />);
    await flush();

    expect(screen.getByText("오늘 79건")).toBeInTheDocument();
    expect(screen.queryByText(/누적/)).not.toBeInTheDocument();
  });

  it("처리 결과 기간은 7일이면 '최근 7일' 로 적는다", async () => {
    render(<DashboardPage />);
    await flush();

    expect(screen.getByText("최근 7일 79건")).toBeInTheDocument();
  });

  it("값이 0 인 처리 항목은 한 줄 '이상 없음 N' 으로 묶는다", async () => {
    render(<DashboardPage />);
    await flush();

    expect(screen.getByText("이상 없음 4")).toBeInTheDocument();
    expect(screen.getByText("비상 알림 · 끝나지 않은 회차 · 확정 실패 · 차단 계정")).toBeInTheDocument();
  });
});
