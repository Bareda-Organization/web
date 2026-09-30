import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditLogPage } from "./AuditLogPage";
import { getAuditLogs, getLoginHistory } from "../api";
import { todayInSeoul } from "@/shared/lib/format/dateTime";

// §6.13, BRIEF-a1.md §4.3 — "전부 보여주는 것이 기본값이 아니다". 판단 근거(코드 주석)는
// 무제한 로그인·접속 이력을 기본으로 펼치지 않는 것이므로, 이 검사는 "오늘"로 좁힌
// from 필터가 실제 조회에 실리는지, "전체 기간 보기"를 눌러야 그 제한이 풀리는지를 본다.
vi.mock("../api", () => ({
  getAuditLogs: vi.fn(),
  getLoginHistory: vi.fn(),
}));

const mockGetAuditLogs = vi.mocked(getAuditLogs);
const mockGetLoginHistory = vi.mocked(getLoginHistory);

const emptyResponse = { items: [], page: 1, size: 20, totalCount: 0, hasNext: false };

describe("AuditLogPage — 기본 조회 범위를 오늘로 좁힘", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("첫 조회는 from 이 오늘 날짜로 채워져 나간다(무제한 전체 기간이 기본값이 아니다)", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    await waitFor(() =>
      expect(mockGetAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ from: todayInSeoul() })),
    );
  });

  // F03-07 — UTC 날짜로 뽑으면 한국 시간 00:00~09:00 에 어제가 들어가 "오늘만" 이라는 화면 의도가 어긋난다.
  it("한국 시간 새벽(UTC 로는 전날)에도 from 은 서울의 오늘 날짜다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T16:00:00Z")); // 서울 2026-10-01 01:00
    try {
      mockGetAuditLogs.mockResolvedValue(emptyResponse);
      render(<AuditLogPage />);

      await waitFor(() =>
        expect(mockGetAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ from: "2026-10-01" })),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("'전체 기간 보기'를 누르면 from 이 비워진 채로 재조회한다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "전체 기간 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() =>
      expect(mockGetAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ from: undefined })),
    );
  });

  it("접속 이력 탭으로 전환하면 getLoginHistory 를 호출한다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetLoginHistory.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("tab", { name: "접속 이력" }));

    await waitFor(() => expect(mockGetLoginHistory).toHaveBeenCalled());
  });
});

// R32-W9 — 감사·접속 이력의 시각이 서버의 ISO 원문으로 보였다.
describe("AuditLogPage — 시각 표기(R32-W9)", () => {
  afterEach(() => vi.clearAllMocks());

  it("감사 이력 시각을 ISO 원문이 아니라 한국 시간으로 보여준다", async () => {
    mockGetAuditLogs.mockResolvedValue({
      ...emptyResponse,
      items: [{ auditId: "1", occurredAt: "2026-09-12T08:00:00Z", actor: "관리자", action: "login", targetType: "account", targetId: "3", detail: null }],
      totalCount: 1,
    } as never);
    render(<AuditLogPage />);

    expect(await screen.findByText("2026-09-12 17:00")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-12T/)).not.toBeInTheDocument();
  });
});
