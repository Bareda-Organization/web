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

  it("조회가 실패하면 오류 문구를 보여주고 목록은 비우며 건수는 보이지 않는다", async () => {
    mockGetAcademies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<AcademiesPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.queryByText("총 0개 학원")).not.toBeInTheDocument(); // 건수를 모르는 상태를 0 으로 보이지 않는다(Ruling 597)
  });
});

// R50 M3 — 서버 `summary` 에는 주소 미등록 · 정원 찬 학원 값이 없어 지금 쪽(20곳)만 센다. 표기가 전체 합계처럼 읽히지 않게 "이 쪽" 을 밝힌다.
describe("AcademiesPage — 쪽 단위 지표 표기(R50 M3)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("주소 미등록 · 정원 찬 학원 지표는 '이 쪽' 한정으로 적는다", async () => {
    mockGetAcademies.mockResolvedValue({
      summary: { total: 45, active: 40, inactive: 5, userCount: 900 },
      items: [{ id: "1", code: "A1", name: "가학원", region: "서울", staffCount: 1, userCount: 10, status: "active", hasAddress: false, pendingSignupCount: 1 }],
      page: 0,
      size: 20,
      totalCount: 45,
      hasNext: true,
    });
    render(<AcademiesPage />);

    expect(await screen.findByText("이 쪽 주소 미등록")).toBeInTheDocument();
    expect(screen.getByText(/이 쪽에서 정원 찬 학원: 가학원/)).toBeInTheDocument();
    expect(screen.getByText(/총 45개 학원 · 이름 순/)).toBeInTheDocument();
  });
});
