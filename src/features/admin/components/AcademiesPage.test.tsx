import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcademiesPage } from "./AcademiesPage";
import { getAcademies } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — features/admin 27개 프로덕션 파일 중 검사가 3개뿐이라, 이
// 화면은 실패 갈래를 확인하는 검사가 하나도 없었다. 조회 실패 시 오류 문구가 뜨는지,
// 목록이 빈 상태로 안전하게 떨어지는지를 본다.
vi.mock("../api", () => ({
  getAcademies: vi.fn(),
}));

const mockGetAcademies = vi.mocked(getAcademies);

describe("AcademiesPage — 목록 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("조회가 실패하면 오류 문구를 보여주고 목록은 비운다", async () => {
    mockGetAcademies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<AcademiesPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.getByText("총 0개 학원")).toBeInTheDocument();
  });
});
