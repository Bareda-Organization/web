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
  address: "서울 강동구 천호대로 1",
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
    fireEvent.change(screen.getByLabelText(/^주소/), { target: { value: "서울 강동구 천호대로 1" } });
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

// Ruling 450 — 학원 주소는 필수다. 주소가 없으면 그 학원의 회차 확정이 전부 ACADEMY_COORDINATES_MISSING 으로 실패하므로
// 첫 운행 날이 아니라 등록·수정 때 막는다. 주소 없이 좌표만 있는 시드 학원도 주소를 넣어야 저장된다.
describe("AcademyFormDialog — 주소 필수(Ruling 450)", () => {
  const MESSAGE = /주소를 입력해 주세요/;
  const fillNameAndRegion = () => {
    fireEvent.change(screen.getByLabelText(/학원명/), { target: { value: "새 학원" } });
    fireEvent.change(screen.getByLabelText(/지역/), { target: { value: "서울" } });
  };

  afterEach(() => vi.clearAllMocks());

  it("등록 — 주소가 비어 있으면 문구를 보이고 저장할 수 없다. 공백만 넣어도 같다", () => {
    render(<AcademyFormDialog onClose={vi.fn()} onDone={vi.fn()} />);
    fillNameAndRegion();

    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^주소/), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("등록 — 주소를 채우면 문구가 사라지고 그 주소로 저장한다", async () => {
    mockCreate.mockResolvedValue({ academyId: "9", code: "C9", name: "새 학원", region: "서울", warnings: [] });
    const onDone = vi.fn();
    render(<AcademyFormDialog onClose={vi.fn()} onDone={onDone} />);
    fillNameAndRegion();

    fireEvent.change(screen.getByLabelText(/^주소/), { target: { value: " 서울 강동구 천호대로 1 " } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ address: "서울 강동구 천호대로 1" })),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("수정 — 주소 없이 저장된 학원(시드)은 열자마자 주소를 넣으라고 알리고, 넣기 전에는 저장할 수 없다", async () => {
    mockGet.mockResolvedValue({ ...DETAIL, address: null });
    mockUpdate.mockResolvedValue(undefined as never);
    render(<AcademyFormDialog academyId="3" onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByDisplayValue("바래다 학원");

    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^주소/), { target: { value: "서울 강동구 천호대로 1" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith("3", expect.objectContaining({ address: "서울 강동구 천호대로 1" })),
    );
  });
});

// 조율자 결정(2026-10-01 02:10) — 주소 없는 옛 학원을 운영에서 내리는 조작을 주소 입력이 막으면 안 된다.
// 원래 비었고 그대로면 상태만 바꾸는 저장에 한해 `address` 키를 보내지 않는다(서버는 키 없음 = 유지로 이미 허용).
describe("AcademyFormDialog — 주소 없는 옛 학원의 상태 변경(Ruling 496)", () => {
  afterEach(() => vi.clearAllMocks());

  it("주소 없이 저장된 학원을 비활성으로 바꾸면 주소를 넣지 않아도 저장되고 요청에 address 키가 없다", async () => {
    mockGet.mockResolvedValue({ ...DETAIL, address: null });
    mockUpdate.mockResolvedValue(undefined as never);
    const onDone = vi.fn();
    render(<AcademyFormDialog academyId="3" onClose={vi.fn()} onDone={onDone} />);
    await screen.findByDisplayValue("바래다 학원");

    fireEvent.click(screen.getByRole("tab", { name: "비활성" }));
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(await screen.findByRole("button", { name: "비활성으로 저장" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty("address", expect.anything());
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("상태를 바꾸지 않은 수정은 주소가 없으면 여전히 저장할 수 없다", async () => {
    mockGet.mockResolvedValue({ ...DETAIL, address: null });
    render(<AcademyFormDialog academyId="3" onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByDisplayValue("바래다 학원");

    fireEvent.change(screen.getByLabelText(/학원명/), { target: { value: "이름만 바꿈" } });

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});

