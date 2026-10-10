import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmLeave, setLeaveWarning } from "@/shared/lib/navigation/leaveGuard";
import { ToastProvider } from "@/shared/ui";
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
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
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
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
    const confirm = vi.spyOn(window, "confirm");
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("저장하지 않은 값이 있으면 떠날 때 묻고, 취소하면 떠나지 않는다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });

    expect(confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("저장하고 나면 다시 묻지 않는다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
    mockUpdate.mockResolvedValue({ noShowWaitMinutes: 10, academy: null, policy: null });
    // false 를 돌려주게 해 둔다 — 경고가 남아 있으면 confirmLeave() 는 true 가 될 수 없다(jsdom 원본 confirm 은 undefined 를 돌려준다).
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    // 저장 결과는 처리 결과 알림(토스트)으로 알린다 — 알림 주인 안에서 그린다.
    render(
      <ToastProvider>
        <AcademySettingsForm />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("학원 설정을 저장했습니다");

    // 토스트와 경고 해제는 같은 저장 처리에서 나오지만, 해제는 렌더 뒤 효과(useLeaveWarning)라 토스트가 먼저 보일 수 있다 — 풀릴 때까지 기다린 뒤 묻는다.
    await waitFor(() => expect(confirmLeave()).toBe(true));
    confirm.mockClear();
    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});

// Ruling 820 · 827 — 정책 값은 응답에서 오고(화면에 숫자를 박지 않는다), 범위 밖 입력은 서버에 보내기 전에 화면이 막는다.
describe("AcademySettingsForm — 정책 읽기 전용 · 범위 검사(R48)", () => {
  afterEach(() => vi.clearAllMocks());

  const policy = {
    confirmLeadMinutes: 45,
    startWindowMinutes: 12,
    changeQuotaPerRun: 2,
    delayUnitMinutes: 7,
    proximityAlertMeters: 250,
    notificationRetentionDays: 21,
  };

  it("전 학원 공통 정책과 학원 정보를 응답 값 그대로 읽기 전용으로 그린다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: { name: "하늘수학학원", code: "HNL-01", region: "부천", status: "active" }, policy });
    render(<AcademySettingsForm />);

    const list = await screen.findByLabelText("전 학원 공통 정책");
    // 사양 기본값(30·±10·1·5·300·14)이 아니라 서버가 준 값이 그려져야 한다 — 값을 박아 두지 않았다는 증거.
    expect(list).toHaveTextContent("출발 45분 전");
    expect(list).toHaveTextContent("출발 ±12분");
    expect(list).toHaveTextContent("회차당 2회");
    expect(list).toHaveTextContent("7분");
    expect(list).toHaveTextContent("250m");
    expect(list).toHaveTextContent("21일");
    expect(screen.getByLabelText("학원 정보")).toHaveTextContent("하늘수학학원");
  });

  // Ruling 848 ⑦ — 학원 상태 값(`active` · `inactive`)을 영문 그대로 보였다. 다른 화면과 같은 한글 라벨로 그린다.
  it.each([
    ["active", "활성"],
    ["inactive", "비활성"],
  ])("학원 상태 %s 는 영문 값이 아니라 '%s' 로 보인다", async (status, label) => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: { name: "하늘수학학원", code: "HNL-01", region: "부천", status }, policy });
    render(<AcademySettingsForm />);

    const row = (await screen.findByText("상태")).parentElement!;
    expect(row.textContent).toBe(`상태${label}`);
  });

  it("1~30 밖의 값(45)을 넣으면 오류 문구를 보이고 저장 단추가 꺼져 서버를 부르지 않는다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "45" } });

    expect(screen.getByText(/1~30분 안에서 정수로 입력해 주세요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("자주 쓰는 값을 누르면 입력칸이 그 값이 된다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    fireEvent.click(screen.getByRole("button", { name: "10분" }));

    expect(screen.getByRole("spinbutton")).toHaveValue(10);
  });

  // R50 S5 · S17 — 입력칸 이름은 사양 용어(A-17 "미승차 대기 시간")이고, 사양에 없는 "비상 알림이 아니라 …" 문구는 지웠다(Ruling 844).
  it("입력칸 이름은 미승차 대기 시간이고, 진행 순서에 비상 알림 안내 문구가 없다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
    render(<AcademySettingsForm />);

    expect(await screen.findByLabelText(/^미승차 대기 시간/)).toHaveValue(3);
    expect(screen.queryByLabelText(/무응답 대기 시간/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("미승차 처리 진행 순서")).toHaveTextContent("관계자에게 보고");
    expect(screen.queryByText(/비상 알림이 아니라/)).not.toBeInTheDocument();
  });
});

// Ruling 876 — 미승차 대기 시간 변경은 저장 뒤 새로 시작되는 미승차부터 적용되고, 이미 진행 중인 카운트다운은 시작 때 정한 만료 시각 그대로다.
describe("AcademySettingsForm — 변경 적용 시점 안내(Ruling 876)", () => {
  afterEach(() => vi.clearAllMocks());

  it("진행 중인 카운트다운은 그대로라는 적용 시점 안내가 보이고, 이전 문구(즉시 적용)는 없다", async () => {
    mockGet.mockResolvedValue({ noShowWaitMinutes: 3, academy: null, policy: null });
    render(<AcademySettingsForm />);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(3));

    expect(
      screen.getByText("저장 뒤 새로 시작되는 미승차부터 적용됩니다. 이미 진행 중인 카운트다운은 시작 때 정한 만료 시각 그대로입니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/즉시 적용|바로 적용/)).not.toBeInTheDocument();
  });
});
