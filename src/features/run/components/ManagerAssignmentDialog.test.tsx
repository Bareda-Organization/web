import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManagerAssignmentDialog } from "./ManagerAssignmentDialog";
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
const mockPatchRunAssignment = vi.mocked(patchRunAssignment);

const managers: ManagerSummaryResponseTypes[] = [
  { id: 1, name: "김기사", phone: "010-1111-1111", role: "driver" },
  { id: 2, name: "박매니저", phone: "010-2222-2222", role: "escort" },
];

describe("ManagerAssignmentDialog — 후보 목록·경고 비차단", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("열리면 후보 목록을 불러와 기사·동승 매니저 옵션으로 나눠 보여준다", async () => {
    mockGetManagers.mockResolvedValue(managers);
    render(<ManagerAssignmentDialog runId={7} open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("김기사")).toBeInTheDocument();
    expect(screen.getByText("박매니저")).toBeInTheDocument();
  });

  it("경고 없이 저장되면 onDone 을 곧바로 호출한다", async () => {
    mockGetManagers.mockResolvedValue(managers);
    mockPatchRunAssignment.mockResolvedValue({
      runId: 7,
      assignments: [{ managerId: 1, name: "김기사", role: "driver" }],
      warnings: [],
    });
    const onDone = vi.fn();
    render(<ManagerAssignmentDialog runId={7} open onClose={vi.fn()} onDone={onDone} />);
    await screen.findByText("김기사");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("경고가 있으면 배치 반영 안내와 경고 메시지를 보여주고, 저장 시점에는 onDone 을 부르지 않는다", async () => {
    mockGetManagers.mockResolvedValue(managers);
    mockPatchRunAssignment.mockResolvedValue({
      runId: 7,
      assignments: [{ managerId: 1, name: "김기사", role: "driver" }],
      warnings: [
        { code: "WORK_HOURS_MISMATCH", managerId: 1, role: "driver", message: "근무 시간과 맞지 않습니다" },
      ],
    });
    const onDone = vi.fn();
    render(<ManagerAssignmentDialog runId={7} open onClose={vi.fn()} onDone={onDone} />);
    await screen.findByText("김기사");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("근무 시간과 맞지 않습니다")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
