import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcademySettingsForm } from "./AcademySettingsForm";
import { getAcademySettings, updateAcademySettings } from "../api";

// §5.21 A-17 · API_SPEC §1.9 — "타임아웃·5xx 는 처리되지 않았습니다" 원칙의 화면
// 쪽 고정. 저장이 서버에서 거부되면 화면이 조용히 넘어가지 않고 명시적 오류
// 문구를 그려야 한다(팀리드가 관리자 콘솔에서 심어 본 "서버가 거부했는데 화면이
// 조용한" 결함이 이 화면에도 통하는지 검사한다).
vi.mock("../api", () => ({
  getAcademySettings: vi.fn(),
  updateAcademySettings: vi.fn(),
}));

const mockGet = vi.mocked(getAcademySettings);
const mockUpdate = vi.mocked(updateAcademySettings);

describe("AcademySettingsForm — 저장 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("저장이 500 으로 거부되면 화면이 조용히 넘어가지 않고 오류 문구를 보여준다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3 });
    mockUpdate.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));

    render(<AcademySettingsForm />);

    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.getByText("학원 설정 저장에 실패했습니다")).toBeInTheDocument());
    expect(screen.queryByText("저장됐습니다")).not.toBeInTheDocument();
  });
});
