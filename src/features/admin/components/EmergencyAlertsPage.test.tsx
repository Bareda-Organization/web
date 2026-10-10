import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmergencyAlertsPage } from "./EmergencyAlertsPage";
import { getEmergencies } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 비상 알림 이력 조회 실패
// 시 오류 문구가 뜨는지를 본다. §1.9 가 요구하는 "타임아웃·5xx 는 처리되지 않았습니다"
// 명시와 직접 관련된 화면이라(비상 알림은 지연 인지 자체가 위험) 다른 화면보다 우선순위가
// 높다.
vi.mock("../api", () => ({
  getEmergencies: vi.fn(),
}));
vi.mock("@/features/map", () => ({ MapSurface: () => <div data-testid="map" /> }));
vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useRealtimeConnection: () => ({ connectionState: "connected", reconnect: vi.fn() }),
}));

const mockGetEmergencies = vi.mocked(getEmergencies);

describe("EmergencyAlertsPage — 목록 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("조회가 실패하면 오류 문구를 보여준다", async () => {
    mockGetEmergencies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<EmergencyAlertsPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
  });
});

// R47 Ruling 744 — 단말이 누른 시각은 접수 시각과 1분 넘게 다를 때만 "발신 시각" 아래에 참고로 덧붙는다(오프라인 큐로 늦게 도착한 비상 — Ruling 616).
describe("EmergencyAlertsPage — 단말 기록 시각 병기", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const item = (id: string, raisedAt: string, occurredAt: string) => ({
    emergencyId: id,
    academy: { id: "1", name: `학원${id}`, contact: "02-000-0000" },
    type: "accident" as const,
    memo: null,
    raisedBy: { name: "이기사", role: "driver" as const, phone: "010-1111-2222" },
    runId: "1",
    busNo: "1호차",
    direction: "to_academy" as const,
    position: { lat: 37.5, lng: 127.0, recordedAt: null },
    riderCount: 1,
    contacts: [],
    raisedAt,
    occurredAt,
    staffAcked: false,
    ackedAt: null,
    canceledAt: null,
    ackedBy: null,
    elapsedSinceRaised: 10,
  });

  it("두 시각이 7분 벌어지면 접수 시각 아래에 단말 기록 시각을 참고로 보이고, 1분 안이면 보이지 않는다", async () => {
    mockGetEmergencies.mockResolvedValue({
      items: [
        item("1", "2026-09-30T08:10:00+09:00", "2026-09-30T08:03:00+09:00"),
        item("2", "2026-09-30T08:20:00+09:00", "2026-09-30T08:19:30+09:00"),
      ],
      unackedCount: 2,
    });
    render(<EmergencyAlertsPage />);

    expect(await screen.findByText("단말 기록 08:03(참고)")).toBeInTheDocument();
    expect(screen.getAllByText(/단말 기록/)).toHaveLength(1);
    expect(screen.getByText("08:10 발신")).toBeInTheDocument();
  });
});

// Z-04(Ruling 379 ①) — §6.11 은 최근 200건까지만 주고 날짜로 좁히는 수단도 없다.
describe("EmergencyAlertsPage — 200건 상한 안내", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const item = (id: string) => ({
    emergencyId: id,
    academy: { id: "1", name: "바래다학원", contact: "02-000-0000" },
    type: "accident" as const,
    memo: null,
    raisedBy: { name: "이기사", role: "driver" as const, phone: "010-1111-2222" },
    runId: "1",
    busNo: "1호차",
    direction: "to_academy" as const,
    position: { lat: 37.5, lng: 127.0, recordedAt: null },
    riderCount: 1,
    contacts: [],
    raisedAt: "2026-09-30T08:00:00",
    staffAcked: false,
    ackedAt: null,
    canceledAt: null,
    ackedBy: null,
    elapsedSinceRaised: 10,
  });

  it("200건이 오면 최근 200건까지만 표시한다고 알리고, 그보다 적으면 알리지 않는다", async () => {
    mockGetEmergencies.mockResolvedValue({ items: Array.from({ length: 200 }, (_, i) => item(String(i))), unackedCount: 200 });
    const { unmount } = render(<EmergencyAlertsPage />);
    expect(await screen.findByText(/최근 200건까지만 표시합니다/)).toBeInTheDocument();
    unmount();

    mockGetEmergencies.mockResolvedValue({ items: [item("1")], unackedCount: 1 });
    render(<EmergencyAlertsPage />);
    await screen.findAllByText("바래다학원");
    expect(screen.queryByText(/최근 200건까지만/)).not.toBeInTheDocument();
  });
});

// R48 시안 `emergency-alerts` — 상태 탭 건수 · 미확인 띠 · 오른쪽 상시 칸 · 미확인 0 이면 초록 안내 띠.
describe("EmergencyAlertsPage — 탭 · 띠 · 상시 칸", () => {
  afterEach(() => vi.clearAllMocks());

  const emergency = (id: string, patch: Record<string, unknown> = {}) => ({
    emergencyId: id,
    academy: { id: "1", name: `학원${id}`, contact: "032-000-0137" },
    type: "vehicle_fault" as const,
    memo: "엔진 경고등 점등",
    raisedBy: { name: "한상철", role: "driver", phone: "010-0000-2012" },
    runId: "1",
    busNo: "2호차",
    direction: "to_academy" as const,
    position: { lat: 37.4871, lng: 126.7783, recordedAt: null },
    riderCount: 9,
    contacts: [],
    raisedAt: "2026-10-03T12:38:12+09:00",
    staffAcked: false,
    ackedAt: null,
    canceledAt: null,
    ackedBy: null,
    elapsedSinceRaised: 840,
    ...patch,
  });

  // 서버는 요청한 상태의 목록과 함께 응답 최상위 `counts`(세 상태 건수)를 준다(§6.11 · Ruling 837).
  const byStatus = (open: unknown[], acked: unknown[], canceled: unknown[]) =>
    mockGetEmergencies.mockImplementation(async (status?: string) => {
      const items = status === "open" ? open : status === "acked" ? acked : canceled;
      return { items, unackedCount: open.length, counts: { open: open.length, acked: acked.length, canceled: canceled.length } } as never;
    });

  it("세 상태의 건수를 탭에 붙이고, 미확인이 있으면 몇 분째 응답이 없는지 띠로 알린다", async () => {
    byStatus([emergency("1")], [emergency("2", { staffAcked: true }), emergency("3", { staffAcked: true })], [emergency("4", { canceledAt: "2026-10-03T12:00:00+09:00" })]);
    render(<EmergencyAlertsPage />);

    expect(await screen.findByRole("tab", { name: "미확인 1건" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "확인됨 2건" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "취소됨 1건" })).toBeInTheDocument();
    expect(screen.getByText("미확인 비상 1건 — 학원 관계자가 아직 응답하지 않았습니다 · 14분째")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "학원에 전화" })).toHaveAttribute("href", "tel:032-000-0137");
    expect(screen.getByRole("link", { name: "전체 관제에서 보기" })).toHaveAttribute("href", "/monitoring");
  });

  // R52 M10 · §6.11 — 학원이 대표 연락처를 등록하지 않으면 contact 는 null 이다. 띠의 [학원에 전화] 가 `tel:null` 이 되면 안 된다.
  it("미확인 비상의 학원 연락처가 null 이면 띠에 [학원에 전화] 를 두지 않고 미등록이라고 적는다", async () => {
    byStatus([emergency("1", { academy: { id: "1", name: "학원1", contact: null } })], [], []);
    render(<EmergencyAlertsPage />);

    await screen.findByRole("tab", { name: "미확인 1건" });
    expect(screen.queryByRole("link", { name: "학원에 전화" })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="tel:null"]')).toBeNull();
    expect(screen.getByRole("link", { name: "전체 관제에서 보기" })).toBeInTheDocument();
    expect(screen.getAllByText(/연락처 미등록/).length).toBeGreaterThan(0);
  });

  // R50 M7 — "1분 미만째" 는 문장이 안 된다. 1분이 안 됐으면 '째' 없이 '1분 미만' 만 적는다.
  it("접수 1분이 안 된 미확인 비상은 '1분 미만째' 가 아니라 '1분 미만' 으로 적는다", async () => {
    byStatus([emergency("1", { elapsedSinceRaised: 30 })], [], []);
    render(<EmergencyAlertsPage />);

    expect(await screen.findByText("미확인 비상 1건 — 학원 관계자가 아직 응답하지 않았습니다 · 1분 미만")).toBeInTheDocument();
    expect(screen.queryByText(/1분 미만째/)).not.toBeInTheDocument();
  });

  // Ruling 837 — 탭 건수 때문에 상태별로 3번 부르던 것을 응답의 `counts` 로 1번에 끝낸다. 되돌리면(상태별 요청) 이 시험만 실패한다.
  it("한 번 읽을 때 요청은 고른 탭의 상태 1번뿐이고, 5초 갱신마다도 1번이다", async () => {
    vi.useFakeTimers();
    try {
      byStatus([emergency("1")], [emergency("2", { staffAcked: true })], []);
      render(<EmergencyAlertsPage />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByRole("tab", { name: "확인됨 1건" })).toBeInTheDocument();
      expect(mockGetEmergencies.mock.calls).toEqual([["open"]]);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockGetEmergencies.mock.calls).toEqual([["open"], ["open"]]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("다른 탭을 누르면 그 상태 1번만 새로 읽고, 건수는 응답의 counts 로 그린다", async () => {
    byStatus([emergency("1")], [emergency("2", { staffAcked: true }), emergency("3", { staffAcked: true })], []);
    render(<EmergencyAlertsPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /확인됨/ }));

    await screen.findByRole("button", { name: "학원2 2호차 상세" });
    expect(mockGetEmergencies.mock.calls).toEqual([["open"], ["acked"]]);
    expect(screen.getByRole("tab", { name: "미확인 1건" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "확인됨 2건" })).toBeInTheDocument();
  });

  // 옛 서버(counts 없음)에서도 화면은 열린다 — 건수만 숨긴다.
  it("응답에 counts 가 없으면 탭 건수를 숨기고 목록은 그린다", async () => {
    mockGetEmergencies.mockResolvedValue({ items: [emergency("1")], unackedCount: 1 } as never);
    render(<EmergencyAlertsPage />);

    expect(await screen.findByRole("tab", { name: "미확인" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "확인됨" })).toBeInTheDocument();
    expect(screen.getAllByText("학원1").length).toBeGreaterThan(0);
  });

  it("미확인이 0 이면 띠가 초록 안내로 바뀐다", async () => {
    byStatus([], [emergency("2", { staffAcked: true })], []);
    render(<EmergencyAlertsPage />);

    expect(await screen.findByText("미확인 비상이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText(/응답하지 않았습니다/)).not.toBeInTheDocument();
    expect(screen.getByText("해당 상태의 비상 알림이 없습니다")).toBeInTheDocument();
  });

  it("행의 상세를 누르면 오른쪽 칸이 그 비상으로 바뀐다", async () => {
    byStatus([emergency("1"), emergency("2", { busNo: "5호차" })], [], []);
    render(<EmergencyAlertsPage />);

    const panel = await screen.findByRole("region", { name: "비상 상세" });
    expect(within(panel).getByText(/2호차 · 등원 · 차량 고장/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "학원2 5호차 상세" }));

    expect(within(screen.getByRole("region", { name: "비상 상세" })).getByText(/5호차 · 등원 · 차량 고장/)).toBeInTheDocument();
  });

  it("확인됨 탭은 확인 소요(acked_at − raised_at)를 보인다", async () => {
    byStatus([], [emergency("2", { staffAcked: true, ackedAt: "2026-10-03T12:40:12+09:00", ackedBy: { name: "이수민", memo: null } })], []);
    render(<EmergencyAlertsPage />);

    fireEvent.click(await screen.findByRole("tab", { name: /확인됨/ }));

    expect(await screen.findByText("응답 2분")).toBeInTheDocument();
  });
});
