import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { EmergencyList } from "./EmergencyList";
import { ackEmergency, getEmergencies } from "../api";

// §5.16 EXC-04 · API_SPEC §1.9 — 확인(ack) 처리가 서버에서 거부되면 화면이
// 조용히 넘어가지 않고 오류 문구를 보여줘야 한다(목록을 다시 불러오지 않고
// 그대로 "확인" 버튼이 남아 있어야 한다는 뜻이기도 하다).
vi.mock("../api", () => ({
  getEmergencies: vi.fn(),
  ackEmergency: vi.fn(),
}));

const mockGet = vi.mocked(getEmergencies);
const mockAck = vi.mocked(ackEmergency);

const ITEM = {
  emergencyId: "1",
  type: "accident" as const,
  memo: null,
  raisedBy: { name: "이기사", role: "driver" as const, phone: "010-1111-2222" },
  runId: "10",
  busNo: "1호차",
  direction: "to_academy" as const,
  position: { lat: 37.5, lng: 127.0, recordedAt: null },
  riderCount: 5,
  contacts: [],
  raisedAt: "2026-09-12T08:00:00",
  ackedAt: null,
  canceledAt: null,
  acked: false,
  ackedBy: null,
};

// R47 Ruling 744 — 단말이 누른 시각은 접수 시각과 1분 넘게 다를 때만 "발생 시각" 아래에 참고로 덧붙는다(오프라인 큐로 늦게 도착한 비상 — Ruling 616).
describe("EmergencyList — 단말 기록 시각 병기", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("두 시각이 7분 벌어지면 접수 시각 아래에 단말 기록 시각을 참고로 보이고, 1분 안이면 보이지 않는다", async () => {
    mockGet.mockResolvedValue({
      items: [
        { ...ITEM, emergencyId: "1", raisedAt: "2026-09-12T08:10:00+09:00", occurredAt: "2026-09-12T08:03:00+09:00" },
        { ...ITEM, emergencyId: "2", raisedAt: "2026-09-12T08:20:00+09:00", occurredAt: "2026-09-12T08:19:30+09:00" },
      ],
      unackedCount: 2,
    });
    render(<EmergencyList />);

    expect(await screen.findByText("단말 기록 08:03(참고)")).toBeInTheDocument();
    expect(screen.getAllByText(/단말 기록/)).toHaveLength(1);
    expect(screen.getByText("2026-09-12 08:10")).toBeInTheDocument();
  });
});

// Z-04(Ruling 379 ①) — §5.16 은 최근 200건까지만 준다.
describe("EmergencyList — 200건 상한 안내", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("200건이 오면 최근 200건까지만 표시한다고 알리고, 그보다 적으면 알리지 않는다", async () => {
    mockGet.mockResolvedValue({ items: Array.from({ length: 200 }, (_, i) => ({ ...ITEM, emergencyId: String(i) })), unackedCount: 200 });
    const { unmount } = render(<EmergencyList />);
    expect(await screen.findByText(/최근 200건까지만 표시합니다/)).toBeInTheDocument();
    unmount();

    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    render(<EmergencyList />);
    await screen.findByRole("button", { name: "확인" });
    expect(screen.queryByText(/최근 200건까지만/)).not.toBeInTheDocument();
  });
});

describe("EmergencyList — 확인(ack) 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("확인 처리가 거부되면 목록을 다시 불러오지 않고 오류 문구를 보여준다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    mockAck.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));

    render(<EmergencyList />);

    await waitFor(() => expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => expect(screen.getByText("확인 처리에 실패했습니다")).toBeInTheDocument());
    // 재조회(load)가 일어나지 않았어야 한다 — 최초 1회만 호출된 채로 남는다.
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

// R32-W6 — 관계자 비상 목록에 연락처가 없고, 자동 갱신이 없고, 위치가 좌표 숫자뿐이었다.
describe("EmergencyList — 연락처·자동 갱신·위치", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const WITH_CONTACTS = {
    ...ITEM,
    contacts: [
      { name: "이기사", role: "driver" as const, phone: "010-1111-2222" },
      { name: "박동승", role: "escort" as const, phone: "010-3333-4444" },
    ],
  };

  it("행을 열면 배치 기사·동승자 연락처가 상세 대화상자에 보인다", async () => {
    mockGet.mockResolvedValue({ items: [WITH_CONTACTS], unackedCount: 1 });
    render(<EmergencyList />);

    fireEvent.click(await screen.findByText("1호차 · 등원"));

    expect(await screen.findByText(/010-3333-4444/)).toBeInTheDocument();
    expect(screen.getAllByText(/010-1111-2222/).length).toBeGreaterThan(0);
    expect(screen.getByText(/동승자/)).toBeInTheDocument();
  });

  it("발신 위치는 좌표 숫자가 아니라 지도 링크로 보인다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    render(<EmergencyList />);

    const link = await screen.findByRole("link", { name: "지도에서 보기" });
    expect(link).toHaveAttribute("href", expect.stringContaining("37.5,127"));
    expect(screen.queryByText(/37\.5000/)).not.toBeInTheDocument();
  });

  it("발생 시각은 ISO 원문이 아니라 한국 시간 표기다", async () => {
    mockGet.mockResolvedValue({ items: [{ ...ITEM, raisedAt: "2026-09-12T08:00:00Z" }], unackedCount: 1 });
    render(<EmergencyList />);

    expect(await screen.findByText("2026-09-12 17:00")).toBeInTheDocument();
    expect(screen.queryByText(/T08:00/)).not.toBeInTheDocument();
  });

  it("5초마다 목록을 다시 불러온다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGet.mockResolvedValue({ items: [], unackedCount: 0 });
    render(<EmergencyList />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(5000);

    expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // R46-FUWEB — 응답을 받은 뒤 다음 갱신을 예약한다(`usePolling`) — 응답 없는 서버에 요청이 겹쳐 쌓이지 않는다.
  it("갱신 응답이 오기 전에는 다음 갱신 요청을 내지 않는다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGet.mockResolvedValueOnce({ items: [], unackedCount: 0 });
    mockGet.mockImplementation(() => new Promise(() => {}));
    render(<EmergencyList />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(5000 * 4);

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});

// F01-08·F01-05 — 무음 주기 갱신의 실패·늦은 응답이 화면의 목록을 바꾸면 안 된다.
describe("EmergencyList — 주기 갱신의 실패·경합(F01-08·F01-05)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("주기 갱신이 실패해도 이미 보이던 미확인 목록을 비우지 않고 오류만 띄운다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGet.mockResolvedValueOnce({ items: [ITEM], unackedCount: 1 });
    render(<EmergencyList />);
    await screen.findByText("1호차 · 등원");

    mockGet.mockRejectedValue(new ApiError(500, "INTERNAL", "서버 오류"));
    await vi.advanceTimersByTimeAsync(5000);

    expect(await screen.findByText("서버 오류")).toBeInTheDocument();
    expect(screen.getByText("1호차 · 등원")).toBeInTheDocument();
    expect(screen.queryByText("해당 상태의 비상 알림이 없습니다")).not.toBeInTheDocument();
  });

  it("필터를 바꾸기 전에 보낸 요청의 늦은 응답은 새 필터의 목록을 덮지 않는다", async () => {
    let resolveOpen: (value: { items: (typeof ITEM)[]; unackedCount: number }) => void = () => {};
    mockGet.mockImplementation((query) =>
      query?.status === "open"
        ? new Promise((resolve) => {
            resolveOpen = resolve;
          })
        : Promise.resolve({ items: [], unackedCount: 0 }),
    );
    render(<EmergencyList />);

    fireEvent.click(screen.getByRole("tab", { name: "확인됨" }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(expect.objectContaining({ status: "acked" })));
    resolveOpen({ items: [ITEM], unackedCount: 1 });

    expect(await screen.findByText("해당 상태의 비상 알림이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("1호차 · 등원")).not.toBeInTheDocument();
  });
});
