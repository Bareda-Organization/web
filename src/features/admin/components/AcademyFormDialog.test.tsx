import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcademyFormDialog } from "./AcademyFormDialog";
import { getAcademy, updateAcademy } from "../api";

vi.mock("../api", () => ({ getAcademy: vi.fn(), updateAcademy: vi.fn(), createAcademy: vi.fn() }));

const mockGet = vi.mocked(getAcademy);
const mockUpdate = vi.mocked(updateAcademy);

const DETAIL = {
  id: "3",
  code: "ABC123",
  name: "바래다 학원",
  region: "서울",
  staffCount: 1,
  userCount: 12,
  status: "active" as const,
  address: null,
  contact: null,
  memo: null,
  staffAccounts: [],
  stats: { movingBusCount: 0 },
};

const openInactiveSave = async () => {
  mockGet.mockResolvedValue(DETAIL);
  const onDone = vi.fn();
  render(<AcademyFormDialog academyId="3" onClose={vi.fn()} onDone={onDone} />);
  await screen.findByDisplayValue("바래다 학원");
  fireEvent.click(screen.getByRole("tab", { name: "비활성" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  return onDone;
};

// R32-W12 — 학원을 비활성으로 저장할 때 확인 없이 바로 저장돼 되돌릴 수 없는 실수가 났다(UF-O-04 는 확인 창을 요구).
describe("AcademyFormDialog — 비활성 저장 전 확인(R32-W12)", () => {
  afterEach(() => vi.clearAllMocks());

  it("활성 → 비활성으로 저장하면 소속 인원과 영향을 알리는 확인 창이 먼저 뜨고 요청은 나가지 않는다", async () => {
    await openInactiveSave();

    expect(await screen.findByText(/소속 사용자 12명/)).toBeInTheDocument();
    expect(screen.getByText(/신규 가입/)).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("확인 창에서 취소하면 저장 요청이 나가지 않는다", async () => {
    await openInactiveSave();
    await screen.findByText(/소속 사용자 12명/);

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.queryByText(/소속 사용자 12명/)).not.toBeInTheDocument();
  });

  it("확인 창에서 확인하면 비활성으로 저장한다", async () => {
    mockUpdate.mockResolvedValue(undefined as never);
    const onDone = await openInactiveSave();
    await screen.findByText(/소속 사용자 12명/);

    fireEvent.click(screen.getByRole("button", { name: "비활성으로 저장" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("3", expect.objectContaining({ status: "inactive" })));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("상태를 바꾸지 않은 수정은 확인 창 없이 바로 저장한다", async () => {
    mockGet.mockResolvedValue(DETAIL);
    mockUpdate.mockResolvedValue(undefined as never);
    render(<AcademyFormDialog academyId="3" onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByDisplayValue("바래다 학원");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });
});
