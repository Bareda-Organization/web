import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BusForm } from "./BusForm";
import { createBus, updateBus } from "../api";
import type { BusItemResponseTypes } from "../types";

// §5.12 BUS-02·03 · API_SPEC §1.9 — 등록이 서버에서 거부되면(예: 409
// DUPLICATE_BUS_NO) 화면이 조용히 onDone 을 호출해 넘어가지 않고 오류
// 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  createBus: vi.fn(),
  updateBus: vi.fn(),
}));

const mockCreate = vi.mocked(createBus);
const mockUpdate = vi.mocked(updateBus);

const existingBus: BusItemResponseTypes = {
  id: "9",
  busNo: "9호차",
  plateNo: "99나9999",
  capacity: 10,
  studentCapacity: 8,
  operable: true,
  routeCount: 0,
  scheduleCount: 0,
  todayRuns: [],
};

describe("BusForm — 등록 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("등록이 거부되면 onDone 을 호출하지 않고 오류 문구를 보여준다", async () => {
    mockCreate.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));
    const onDone = vi.fn();

    render(<BusForm onClose={vi.fn()} onDone={onDone} />);

    // 호차·차량번호는 텍스트 입력(getAllByRole("textbox") 순서로 짚음 —
    // StudentForm.test.tsx 와 같은 우회), 승차 정원은 number 타입이라
    // spinbutton 역할로 채운다(AcademySettingsForm.test.tsx 와 같은 우회).
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "1호차" } });
    fireEvent.change(textboxes[1], { target: { value: "12가3456" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.getByText("차량 저장에 실패했습니다")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  // W5 — API_SPEC §5.12 "PATCH 응답의 warnings[]"(BR-116). 저장은 이미 됐으므로
  // (ManagerAssignmentDialog.tsx 와 같은 판단) onDone 을 즉시 부르지 않고 경고를
  // 먼저 보여준다.
  it("수정 응답에 CAPACITY_BELOW_ASSIGNED 경고가 있으면 저장 직후 onDone 을 부르지 않고 경고를 보여준다", async () => {
    mockUpdate.mockResolvedValue({
      ...existingBus,
      capacity: 10,
      warnings: [{ code: "CAPACITY_BELOW_ASSIGNED", runId: "3", serviceDate: "2026-09-30", departTime: "2026-09-30T08:00:00+09:00", direction: "to_academy", assignedCount: 12, studentCapacity: 8 }],
    });
    const onDone = vi.fn();

    render(<BusForm bus={existingBus} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.getByText(/정원.*8명.*12명/)).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("경고 없이 수정에 성공하면 곧바로 onDone 을 부른다", async () => {
    mockUpdate.mockResolvedValue({ ...existingBus, warnings: [] });
    const onDone = vi.fn();

    render(<BusForm bus={existingBus} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  // F02-16 — 경고가 뜬 시점에 수정은 이미 저장됐다. 확인 버튼이 아니라 Esc(대화상자의 onClose)로 닫아도 목록이 갱신돼야 한다.
  it("경고 화면에서 [확인] 대신 Esc 로 닫아도 onDone(목록 갱신)을 부른다", async () => {
    mockUpdate.mockResolvedValue({
      ...existingBus,
      warnings: [{ code: "CAPACITY_BELOW_ASSIGNED", runId: "3", serviceDate: "2026-09-30", departTime: "2026-09-30T08:00:00+09:00", direction: "to_academy", assignedCount: 12, studentCapacity: 8 }],
    });
    const onDone = vi.fn();
    const onClose = vi.fn();

    render(<BusForm bus={existingBus} onClose={onClose} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText(/정원.*8명.*12명/);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("정원 입력칸 아래에 탑승 가능 인원 계산식이 저장 전 값과 함께 나오고, 경고는 건수가 붙은 한 상자로 묶인다", async () => {
    mockUpdate.mockResolvedValue({
      ...existingBus,
      warnings: [{ code: "CAPACITY_BELOW_ASSIGNED", runId: "3", serviceDate: "2026-09-30", departTime: "2026-09-30T08:00:00+09:00", direction: "to_academy", assignedCount: 12, studentCapacity: 8 }],
    });

    render(<BusForm bus={existingBus} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("탑승 가능 인원 8 = 정원 10 − 기사 1 − 동승자 1 (저장 전 8명)")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "20" } });
    expect(screen.getByText("탑승 가능 인원 18 = 정원 20 − 기사 1 − 동승자 1 (저장 전 8명)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("수정은 저장됐습니다 — 확인할 경고 1건")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("경고 문구는 내부 번호만 던지지 않고 무엇이 넘쳤는지 말한다", async () => {
    mockUpdate.mockResolvedValue({
      ...existingBus,
      warnings: [{ code: "CAPACITY_BELOW_ASSIGNED", runId: "3", serviceDate: "2026-09-30", departTime: "2026-09-30T08:00:00+09:00", direction: "to_academy", assignedCount: 12, studentCapacity: 8 }],
    });

    render(<BusForm bus={existingBus} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("정원 8명을 넘는 회차가 있습니다 — 배정 인원 12명 (2026-09-30 08:00 등원 회차, 회차 번호 3)")).toBeInTheDocument();
  });
});

// R46-FUWEB B1 #19 — 목록이 방금 저장한 행을 강조하도록, 저장이 끝나면 그 차량의 id 를 onDone 에 실어 보낸다.
describe("BusForm — 저장한 차량 id 전달", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("등록하면 서버가 만든 차량 id, 수정하면 고친 차량 id, 경고를 확인하면 수정한 차량 id 를 onDone 에 넘긴다", async () => {
    mockCreate.mockResolvedValue({ ...existingBus, id: "31" });
    const created = vi.fn();
    const { unmount } = render(<BusForm onClose={vi.fn()} onDone={created} />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "1호차" } });
    fireEvent.change(textboxes[1], { target: { value: "12가3456" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(created).toHaveBeenCalledWith("31"));
    unmount();

    mockUpdate.mockResolvedValue({ ...existingBus, warnings: [] });
    const updated = vi.fn();
    const second = render(<BusForm bus={existingBus} onClose={vi.fn()} onDone={updated} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updated).toHaveBeenCalledWith("9"));
    second.unmount();

    mockUpdate.mockResolvedValue({
      ...existingBus,
      warnings: [{ code: "CAPACITY_BELOW_ASSIGNED", runId: "3", serviceDate: "2026-09-30", departTime: "2026-09-30T08:00:00+09:00", direction: "to_academy", assignedCount: 12, studentCapacity: 8 }],
    });
    const confirmed = vi.fn();
    render(<BusForm bus={existingBus} onClose={vi.fn()} onDone={confirmed} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(await screen.findByRole("button", { name: "확인" }));
    expect(confirmed).toHaveBeenCalledWith("9");
  });
});

