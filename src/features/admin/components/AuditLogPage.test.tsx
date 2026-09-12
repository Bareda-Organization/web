import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditLogPage } from "./AuditLogPage";
import { getAuditLogs, getLoginHistory } from "../api";

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

    const today = new Date().toISOString().slice(0, 10);
    await waitFor(() =>
      expect(mockGetAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ from: today })),
    );
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
