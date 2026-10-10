import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManagerAssignmentDialog } from "./ManagerAssignmentDialog";
import { ApiError } from "@/shared/lib/http";
import { getManagers, patchRunAssignment } from "../api";
import type { ManagerSummaryResponseTypes } from "../types";

// §5.14 는 경고 3종(WORK_HOURS_MISMATCH · MANAGER_DOUBLE_BOOKED · WORK_HOURS_NOT_SET)이
// 비차단이라 배치는 이미 반영된 뒤 경고만 보여주는 구조다(컴포넌트 주석) — "경고가 오면
// onDone 을 곧바로 부르지 않고 확인을 한 번 더 받는가" 가 이 화면의 핵심 검증 대상이다.
vi.mock("../api", () => ({
  getManagers: vi.fn(),
  patchRunAssignment: vi.fn(),
}));

const mockGetManagers = vi.mocked(getManagers);
// 후보는 역할별로 따로 조회한다 — 역할 인자에 맞는 쪽만 돌려준다.
const mockCandidates = (all: ManagerSummaryResponseTypes[], hasNext: Partial<Record<"driver" | "escort", boolean>> = {}) =>
  mockGetManagers.mockImplementation(async (role) => ({
    items: all.filter((m) => m.role === role),
    hasNext: hasNext[role] ?? false,
  }));
const mockPatchRunAssignment = vi.mocked(patchRunAssignment);

const managers: ManagerSummaryResponseTypes[] = [
  { id: "1", name: "김기사", phone: "010-1111-1111", role: "driver" },
  { id: "2", name: "박매니저", phone: "010-2222-2222", role: "escort" },
];

describe("ManagerAssignmentDialog — 후보 목록·경고 비차단", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("열리면 후보 목록을 불러와 기사·동승자 옵션으로 나눠 보여준다", async () => {
    mockCandidates(managers);
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("김기사")).toBeInTheDocument();
    expect(screen.getByText("박매니저")).toBeInTheDocument();
  });

  // R52 M9 — 앞 20명만 오고 안내가 없던 것. 역할별로 받고, 한쪽이라도 상한을 넘으면 일부만 보인다고 알린다.
  it("기사·동승자를 역할별로 따로 조회한다", async () => {
    mockCandidates(managers);
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText("김기사");

    expect(mockGetManagers).toHaveBeenCalledWith("driver");
    expect(mockGetManagers).toHaveBeenCalledWith("escort");
  });

  it("후보가 상한을 넘으면 앞의 100명만 보인다고 알리고, 넘지 않으면 안내가 없다", async () => {
    mockCandidates(managers, { driver: true });
    const { unmount } = render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText("김기사");
    expect(screen.getByText("기사가 100명을 넘어 앞의 100명만 보입니다")).toBeInTheDocument();
    unmount();

    mockCandidates(managers);
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText("김기사");
    expect(screen.queryByText(/명만 보입니다/)).not.toBeInTheDocument();
  });

  it("동승자 후보가 상한을 넘으면 동승자 쪽 안내만 뜬다", async () => {
    mockCandidates(managers, { escort: true });
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText("김기사");

    expect(screen.getByText("동승자가 100명을 넘어 앞의 100명만 보입니다")).toBeInTheDocument();
    expect(screen.queryByText(/기사가 100명/)).not.toBeInTheDocument();
  });

  // 한쪽 조회만 실패해도 받은 쪽 후보는 보여 준다 — 기사만 바꾸려는데 동승자 조회 실패로 화면 전체가 비면 일을 못 한다.
  it("동승자 후보 조회만 실패하면 기사 후보는 보이고 실패한 쪽만 알린다", async () => {
    mockGetManagers.mockImplementation(async (role) => {
      if (role === "escort") throw new Error("boom");
      return { items: managers.filter((m) => m.role === role), hasNext: false };
    });
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("김기사")).toBeInTheDocument();
    expect(screen.getByText("동승자 후보를 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText("박매니저")).not.toBeInTheDocument();
  });

  it("기사 후보 조회만 실패하면 동승자 후보는 보이고 실패한 쪽만 알린다", async () => {
    mockGetManagers.mockImplementation(async (role) => {
      if (role === "driver") throw new Error("boom");
      return { items: managers.filter((m) => m.role === role), hasNext: false };
    });
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("박매니저")).toBeInTheDocument();
    expect(screen.getByText("기사 후보를 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText("김기사")).not.toBeInTheDocument();
  });

  it("다시 열었을 때 이전에 떴던 '일부만 보입니다' 안내가 조회 실패 뒤에도 남지 않는다", async () => {
    mockCandidates(managers, { driver: true, escort: true });
    const { rerender } = render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText("기사가 100명을 넘어 앞의 100명만 보입니다");
    rerender(<ManagerAssignmentDialog runId="7" open={false} onClose={vi.fn()} onDone={vi.fn()} />);

    mockGetManagers.mockRejectedValue(new Error("boom"));
    rerender(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText(/후보를 불러오지 못했습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/명만 보입니다/)).not.toBeInTheDocument();
  });

  // N-01 — §5.14 임시 취소된 회차의 배치 변경은 409 RUN_CANCELED(Ruling 376).
  it("RUN_CANCELED 는 서버 원문이 아니라 취소된 회차라는 한국어 문구로 알린다", async () => {
    mockCandidates(managers);
    mockPatchRunAssignment.mockRejectedValue(new ApiError(409, "RUN_CANCELED", "서버 원문"));
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText("김기사");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("임시 취소된 회차라 배치를 바꿀 수 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("서버 원문")).not.toBeInTheDocument();
  });

  it("경고 없이 저장되면 onDone 을 곧바로 호출한다", async () => {
    mockCandidates(managers);
    mockPatchRunAssignment.mockResolvedValue({
      runId: "7",
      assignments: [{ managerId: "1", name: "김기사", role: "driver" }],
      warnings: [],
    });
    const onDone = vi.fn();
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={onDone} />);
    await screen.findByText("김기사");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("경고가 있으면 배치 반영 안내와 경고 메시지를 보여주고, 저장 시점에는 onDone 을 부르지 않는다", async () => {
    mockCandidates(managers);
    mockPatchRunAssignment.mockResolvedValue({
      runId: "7",
      assignments: [{ managerId: "1", name: "김기사", role: "driver" }],
      warnings: [
        { code: "WORK_HOURS_MISMATCH", managerId: "1", role: "driver", message: "근무 시간과 맞지 않습니다" },
      ],
    });
    const onDone = vi.fn();
    render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={onDone} />);
    await screen.findByText("김기사");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("근무 시간과 맞지 않습니다")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  // F01-06 — 부모는 이 대화상자를 항상 마운트해 두고 `open` 만 바꾼다. 닫혔다 다시 열 때 이전 저장의
  // 경고 화면(확인 버튼만)이나 고른 값이 남아 있으면 안 된다.
  it("경고를 확인하고 닫은 뒤 다시 열면 저장 버튼이 있는 새 입력 화면이다", async () => {
    mockCandidates(managers);
    mockPatchRunAssignment.mockResolvedValue({
      runId: "7",
      assignments: [{ managerId: "1", name: "김기사", role: "driver" }],
      warnings: [{ code: "WORK_HOURS_MISMATCH", managerId: "1", role: "driver", message: "근무 시간과 맞지 않습니다" }],
    });
    const { rerender } = render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={() => rerender(<ManagerAssignmentDialog runId="7" open={false} onClose={vi.fn()} onDone={vi.fn()} />)} />);
    await screen.findByText("김기사");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(await screen.findByRole("button", { name: "확인" }));

    rerender(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(screen.queryByText("근무 시간과 맞지 않습니다")).not.toBeInTheDocument();
  });

  it("저장에 성공하면 고른 기사·동승자 값을 비워, 다른 회차에서 열어도 이전 선택이 남지 않는다", async () => {
    mockCandidates(managers);
    mockPatchRunAssignment.mockResolvedValue({
      runId: "7",
      assignments: [{ managerId: "1", name: "김기사", role: "driver" }],
      warnings: [],
    });
    const { rerender } = render(<ManagerAssignmentDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText("김기사");
    fireEvent.change(screen.getByLabelText("기사"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(mockPatchRunAssignment).toHaveBeenCalled());

    rerender(<ManagerAssignmentDialog runId="8" open={false} onClose={vi.fn()} onDone={vi.fn()} />);
    rerender(<ManagerAssignmentDialog runId="8" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect((await screen.findByLabelText("기사")) as HTMLSelectElement).toHaveProperty("value", "");
  });
});
