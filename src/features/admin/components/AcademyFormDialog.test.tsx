import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcademyFormDialog } from "./AcademyFormDialog";
import { ApiError } from "@/shared/lib/http";
import { createAcademy, getAcademy, updateAcademy } from "../api";

vi.mock("../api", () => ({ getAcademy: vi.fn(), updateAcademy: vi.fn(), createAcademy: vi.fn() }));

const mockGet = vi.mocked(getAcademy);
const mockUpdate = vi.mocked(updateAcademy);
const mockCreate = vi.mocked(createAcademy);

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

// N-04·N-06 — §6.2·§6.3 주소 검증 실패(422)는 저장이 보류된다. 서버 원문 대신 고칠 자리를 알린다. 메모는 200자까지.
describe("AcademyFormDialog — 주소 검증·메모 길이", () => {
  afterEach(() => vi.clearAllMocks());

  it.each([
    [422, "ADDRESS_VERIFICATION_FAILED", "주소를 확인하지 못했습니다. 주소를 다시 확인해 주세요"],
    [503, "ADDRESS_VERIFICATION_UNAVAILABLE", "주소 확인 서비스에 연결하지 못했습니다. 잠시 뒤 다시 저장해 주세요"],
  ])("%s %s 는 서버 원문이 아니라 쉬운 한국어 문구로 알리고 닫지 않는다", async (status, code, message) => {
    mockCreate.mockRejectedValue(new ApiError(status, code, "서버 원문"));
    const onDone = vi.fn();
    render(<AcademyFormDialog onClose={vi.fn()} onDone={onDone} />);
    fireEvent.change(screen.getByLabelText(/학원명/), { target: { value: "새 학원" } });
    fireEvent.change(screen.getByLabelText(/지역/), { target: { value: "서울" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText("서버 원문")).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("메모 입력칸은 200자까지만 받는다", () => {
    render(<AcademyFormDialog onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByLabelText("메모")).toHaveAttribute("maxlength", "200");
  });
});

// A#10(R46-WEB) — 주소는 선택 입력(§6.2)이지만 비우면 그 학원의 회차 확정이 전부 ACADEMY_COORDINATES_MISSING 으로 막힌다.
// 막히는 원인이 화면에서 보이도록 주소를 비워 둔 동안 경고를 보여 준다.
describe("AcademyFormDialog — 주소 비움 경고", () => {
  it("주소가 비어 있으면 회차 확정이 시작되지 않는다는 경고를 보이고, 주소를 넣으면 사라진다", () => {
    render(<AcademyFormDialog onClose={vi.fn()} onDone={vi.fn()} />);
    const warning = "주소를 비워 두면 이 학원의 회차 확정이 시작되지 않습니다. 등록 뒤에라도 주소를 넣어 주세요";

    expect(screen.getByText(warning)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^주소/), { target: { value: "서울 강동구 천호대로 1" } });

    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });
});
