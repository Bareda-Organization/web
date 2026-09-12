import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmergencyAlertsPage } from "./EmergencyAlertsPage";
import { getEmergencies } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 비상 알림 이력 조회 실패
// 시 오류 문구가 뜨는지를 본다. §1.9 가 요구하는 "타임아웃·5xx 는 처리되지 않았습니다"
// 명시와 직접 관련된 화면이라(비상 알림은 지연 인지 자체가 위험) 다른 화면보다 우선순위가
// 높다.
vi.mock("../api", () => ({
  getEmergencies: vi.fn(),
}));

const mockGetEmergencies = vi.mocked(getEmergencies);

describe("EmergencyAlertsPage — 목록 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("조회가 실패하면 오류 문구를 보여준다", async () => {
    mockGetEmergencies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<EmergencyAlertsPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
  });
});
