import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmLeave, setLeaveWarning } from "@/shared/lib/navigation/leaveGuard";
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

// R32-W13 — 이탈 경고가 노선 편집에만 있어, 학원 설정을 고치다 사이드바로 나가면 값이 조용히 사라졌다.
describe("AcademySettingsForm — 이탈 경고(R32-W13)", () => {
  afterEach(() => {
    setLeaveWarning(null);
    vi.restoreAllMocks();
  });

  it("값을 고치지 않았으면 묻지 않고 떠난다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3 });
    const confirm = vi.spyOn(window, "confirm");
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("저장하지 않은 값이 있으면 떠날 때 묻고, 취소하면 떠나지 않는다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3 });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });

    expect(confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("저장하고 나면 다시 묻지 않는다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3 });
    mockUpdate.mockResolvedValue({ noShowWaitMinutes: 10 });
    const confirm = vi.spyOn(window, "confirm");
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("저장됐습니다");

    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
