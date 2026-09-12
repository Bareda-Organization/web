import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonitoringPage } from "./MonitoringPage";
import { getAcademies, getAcademyRunsLive } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 학원 목록 조회(진입점)가
// 실패하면 오류 문구가 뜨고, 회차 조회(getAcademyRunsLive)로는 넘어가지 않는지를 본다
// — academyId 가 정해지지 않은 채로 회차 조회를 시도하면 안 된다.
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
});
