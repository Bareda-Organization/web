import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { AcademiesPage } from "./AcademiesPage";
import { AuditLogPage } from "./AuditLogPage";
import { BlockedAccountsPage } from "./BlockedAccountsPage";
import { EmergencyAlertsPage } from "./EmergencyAlertsPage";
import { MemberAccountsPage } from "./MemberAccountsPage";
import { MemberApprovalsPage } from "./MemberApprovalsPage";
import {
  getAcademies,
  getAuditLogs,
  getBlockedAccounts,
  getEmergencies,
  getLoginHistory,
  getStaffAccounts,
  getStaffSignupRequests,
} from "../api";

// R48 — 비상 알림 오른쪽 상시 칸의 작은 지도는 jsdom 에서 외부 스크립트를 불러오려다 오류를 내므로 목으로 바꾼다(지도 자체는 NaverMapSurface.test 가 맡는다).
vi.mock("@/features/map", () => ({ MapSurface: () => null }));
// 비상 알림 화면이 실시간 연결 상태를 읽는다(R48 머리말 "실시간 연결됨") — 시험에서 실제 WebSocket 을 열지 않게 연결 상태 훅만 목으로 바꾼다.
vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useRealtimeConnection: () => ({ connectionState: "connected", reconnect: vi.fn() }),
}));

// F03-04 — 서버는 첫 쪽 20건만 준다. 목록 화면은 total_count 로 머리글을 쓰고 [다음] 으로 다음 쪽을 읽어야 한다.
// F03-06 — 폴링·재조회 한 번의 실패가 이미 보이던 목록을 지우고 "없습니다" 를 그리면 안 된다.
vi.mock("../api", () => ({
  getAcademies: vi.fn(),
  getAllAcademies: vi.fn().mockResolvedValue([]),
  getAuditActors: vi.fn().mockResolvedValue([]),
  getAuditLogs: vi.fn(),
  getBlockedAccounts: vi.fn(),
  getEmergencies: vi.fn(),
  getLoginHistory: vi.fn(),
  getStaffAccounts: vi.fn(),
  getStaffSignupRequests: vi.fn(),
}));

const paged = <T,>(items: T[], totalCount: number, hasNext: boolean, page = 0) => ({ items, page, size: 20, totalCount, hasNext });

const academy = (id: number) => ({ id: String(id), code: `A${id}`, name: `학원${id}`, region: "서울", staffCount: 1, userCount: 1, status: "active" as const });
const staffRequest = (id: number) => ({ requestId: String(id), name: `요청자${id}`, phone: "010", academy: { id: "1", name: "학원", region: "서울" }, requestedAt: "2026-09-30T05:00:00Z", academyStaffCount: 0 });
const staffAccount = (id: number) => ({ accountId: String(id), name: `계정${id}`, loginId: `l${id}`, phone: "010", academyName: "학원", lastLoginAt: null, status: "active" as const });
const blocked = (id: number) => ({ accountId: String(id), loginId: `b${id}`, name: `차단${id}`, academyName: "학원", blockedAt: "2026-09-10T09:00:00Z", failedAttempts: 5, reason: "실패", role: "staff" as const, statusBeforeBlock: "active" as const });

describe("메인 관리자 목록 — 총 개수와 다음 쪽", () => {
  afterEach(() => vi.clearAllMocks());

  it.each([
    ["학원", vi.mocked(getAcademies), () => <AcademiesPage />, academy, "총 45개 학원 · 이름 순", "학원21"],
    ["가입 요청", vi.mocked(getStaffSignupRequests), () => <MemberApprovalsPage />, staffRequest, "가입 요청 45건", "요청자21"],
    ["관계자 계정", vi.mocked(getStaffAccounts), () => <MemberAccountsPage />, staffAccount, "총 45개 계정", "계정21"],
    ["차단 계정", vi.mocked(getBlockedAccounts), () => <BlockedAccountsPage />, blocked, /차단된 계정 45건/, "차단21"],
  ] as const)("%s — 머리글은 서버의 total_count 를 쓰고 [다음] 이 다음 쪽(page=1)을 읽는다", async (_name, api, renderPage, make, header, secondPageItem) => {
    const mock = api as unknown as ReturnType<typeof vi.fn>;
    mock.mockImplementation(async (...args: unknown[]) => {
      const paging = (args.find((arg) => typeof arg === "object" && arg !== null && "page" in (arg as object)) ?? { page: 0 }) as { page: number };
      return paged([make(paging.page === 0 ? 1 : 21)], 45, paging.page === 0, paging.page);
    });
    render(renderPage());

    expect(await screen.findByText(header)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    // 가입 승인은 첫 요청이 오른쪽 처리 칸에도 나온다(R48) — 같은 이름이 둘이어도 새 쪽의 항목이 보이면 된다.
    expect((await screen.findAllByText(secondPageItem)).length).toBeGreaterThan(0);
  });
});

describe("메인 관리자 목록 — 재조회 실패에도 직전 목록 유지", () => {
  afterEach(() => vi.clearAllMocks());

  it("차단 계정: 다음 쪽 조회가 실패해도 보이던 목록을 지우거나 '차단된 계정이 없습니다' 를 그리지 않는다", async () => {
    vi.mocked(getBlockedAccounts)
      .mockResolvedValueOnce(paged([blocked(1)], 45, true))
      .mockRejectedValueOnce(new ApiError(503, "UNKNOWN", "점검 중"));
    render(<BlockedAccountsPage />);
    await screen.findByText("차단1");

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(await screen.findByText("점검 중")).toBeInTheDocument();
    expect(screen.getByText("차단1")).toBeInTheDocument();
    expect(screen.queryByText("차단된 계정이 없습니다")).not.toBeInTheDocument();
  });

  it("차단 계정: 처음부터 조회가 실패하면 '차단된 계정이 없습니다' 대신 오류만 보인다", async () => {
    vi.mocked(getBlockedAccounts).mockRejectedValue(new ApiError(503, "UNKNOWN", "점검 중"));
    render(<BlockedAccountsPage />);

    expect(await screen.findByText("점검 중")).toBeInTheDocument();
    expect(screen.queryByText("차단된 계정이 없습니다")).not.toBeInTheDocument();
  });

  it("비상 알림: 5초 갱신이 한 번 실패해도 미확인 목록이 남고 '없습니다' 가 뜨지 않는다", async () => {
    vi.useFakeTimers();
    try {
      const item = {
        emergencyId: "1", academy: { id: "1", name: "바래다 학원", contact: "02" }, type: "accident", memo: null,
        raisedBy: { name: "김기사", role: "driver", phone: null }, runId: "7", busNo: "5호차", direction: "to_academy",
        position: null, riderCount: 3, contacts: [], raisedAt: "2026-09-30T05:00:00Z", staffAcked: false,
        ackedAt: null, canceledAt: null, ackedBy: null, elapsedSinceRaised: 60,
      };
      // 한 번 읽을 때 요청은 고른 탭의 상태 1번이다(Ruling 837). 첫 읽기는 성공, 다음 갱신은 실패시킨다.
      let failing = false;
      vi.mocked(getEmergencies).mockImplementation(async (status?: string) => {
        if (failing) throw new ApiError(503, "UNKNOWN", "점검 중");
        return { items: status === "open" ? [item] : [], unackedCount: 1 } as never;
      });
      render(<EmergencyAlertsPage />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getAllByText(/5호차/).length).toBeGreaterThan(0);
      // F03-11 — 발신 후 경과 시간(elapsed_since_raised 60초)과 역할 한글 표기
      expect(screen.getByText("1분")).toBeInTheDocument();
      expect(screen.getAllByText("김기사").length).toBeGreaterThan(0);
      expect(screen.getAllByText("기사").length).toBeGreaterThan(0);

      failing = true;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(screen.getByText("점검 중")).toBeInTheDocument();
      expect(screen.getAllByText(/5호차/).length).toBeGreaterThan(0);
      expect(screen.queryByText("해당 상태의 비상 알림이 없습니다")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("감사·접속 이력 — 다음 쪽과 실패 시 목록 유지", () => {
  afterEach(() => vi.clearAllMocks());

  it("감사 로그: [다음] 이 page=1 로 다시 조회하고, 필터를 바꿔 조회하면 0쪽부터 읽는다", async () => {
    vi.mocked(getAuditLogs).mockImplementation(async (query) => paged([], 45, (query?.page ?? 0) === 0, query?.page ?? 0));
    vi.mocked(getLoginHistory).mockResolvedValue(paged([], 0, false));
    render(<AuditLogPage />);
    await waitFor(() => expect(getAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 0 })), { timeout: 3000 });

    // 첫 응답이 와서 has_next 가 반영돼야 [다음] 이 켜진다.
    await waitFor(() => expect(screen.getByRole("button", { name: "다음" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(getAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })), { timeout: 3000 });

    fireEvent.click(screen.getByRole("tab", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(getAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, action: "update" })), {
      timeout: 3000,
    });
  });
});
