import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonitoringPage } from "./MonitoringPage";
import { getAcademies, getAcademyRunsLive } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 학원 목록 조회(진입점)가
// 실패하면 오류 문구가 뜨고, 회차 조회(getAcademyRunsLive)로는 넘어가지 않는지를 본다
// — academyId 가 정해지지 않은 채로 회차 조회를 시도하면 안 된다.
//
// FE-R2 W 목표 1 — 조회 실패 시 EmptyState("등록된 학원이 없습니다" · "지금 운행 중인
// 회차가 없습니다")가 오류 배너와 동시에 뜨던 것을 고쳤다(MonitoringPage.tsx !error
// 가드, 두 갈래 모두). 아래 두 검사가 그 가드를 고정한다 — 가드를 지우면 이 검사들만
// 실패해야 한다.
vi.mock("../api", () => ({
  getAcademies: vi.fn(),
  getAcademyRunsLive: vi.fn(),
}));

const mockGetAcademies = vi.mocked(getAcademies);
const mockGetRunsLive = vi.mocked(getAcademyRunsLive);

describe("MonitoringPage — 학원 목록 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("학원 목록 조회가 실패하면 오류 문구를 보여주고 회차 조회로 넘어가지 않는다", async () => {
    mockGetAcademies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MonitoringPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(mockGetRunsLive).not.toHaveBeenCalled();
  });

  it("학원 목록 조회가 실패하면 EmptyState 는 뜨지 않는다 — '정말 0건' 과 '조회 실패' 를 구별한다", async () => {
    mockGetAcademies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MonitoringPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.queryByText("등록된 학원이 없습니다")).not.toBeInTheDocument();
  });
});

describe("MonitoringPage — 실시간 회차 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("회차 조회가 실패하면 EmptyState 는 뜨지 않는다 — '정말 0건' 과 '조회 실패' 를 구별한다", async () => {
    mockGetAcademies.mockResolvedValue({
      items: [{ id: 1, code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" }],
      page: 1,
      size: 20,
      totalCount: 1,
      hasNext: false,
    });
    mockGetRunsLive.mockRejectedValue(new ApiError(500, "UNKNOWN", "실시간 회차 조회 중 오류가 발생했습니다"));
    render(<MonitoringPage />);

    await waitFor(() => expect(screen.getByText("실시간 회차 조회 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.queryByText("지금 운행 중인 회차가 없습니다")).not.toBeInTheDocument();
  });
});
