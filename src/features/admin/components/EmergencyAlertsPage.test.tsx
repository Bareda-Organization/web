import { render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("2026-09-30 08:10")).toBeInTheDocument();
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
    await screen.findByText("바래다학원");
    expect(screen.queryByText(/최근 200건까지만/)).not.toBeInTheDocument();
  });
});
