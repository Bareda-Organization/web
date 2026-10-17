import { afterEach, describe, expect, it, vi } from "vitest";
import { getEmergencies } from "./emergencies";
import { mockJsonResponse } from "@/shared/testing/httpResponse";

// §6.11 — occurred_at 은 단말이 누른 시각(참고값)이다. 서버가 항상 채우지만 어댑터는 없는 응답도 null 로 견딘다(R47 Ruling 744).
describe("admin emergencies api — occurred_at 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const raw = (extra: Record<string, unknown>) => ({
    emergency_id: 1,
    academy: { id: 3, name: "바래다학원", contact: "02-000-0000" },
    type: "accident",
    memo: null,
    raised_by: { name: "이기사", role: "driver", phone: "010-1111-2222" },
    run_id: 7,
    bus_no: "1호차",
    direction: "to_academy",
    position: null,
    rider_count: 3,
    contacts: [],
    raised_at: "2026-09-15T08:10:00",
    staff_acked: false,
    acked_at: null,
    canceled_at: null,
    acked_by: null,
    elapsed_since_raised: 30,
    ...extra,
  });

  it("occurred_at 을 occurredAt 으로 옮기고, 응답에 없으면 null 이다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [raw({ occurred_at: "2026-09-15T08:03:00" }), raw({ emergency_id: 2 })],
            unacked_count: 2,
          },
        }),
      ),
    );

    const result = await getEmergencies();

    expect(result.items[0].occurredAt).toBe("2026-09-15T08:03:00");
    expect(result.items[1].occurredAt).toBeNull();
  });

  // Ruling 837 — 응답 최상위 counts(세 상태 건수)를 그대로 옮긴다. 옛 서버처럼 없으면 undefined 로 견딘다.
  it("응답 최상위 counts 를 옮기고, 없으면 undefined 다", async () => {
    const respond = (data: Record<string, unknown>) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(200, { success: true, data })));

    respond({ items: [raw({})], unacked_count: 1, counts: { open: 1, acked: 4, canceled: 2 } });
    expect((await getEmergencies("open")).counts).toEqual({ open: 1, acked: 4, canceled: 2 });

    respond({ items: [raw({})], unacked_count: 1 });
    expect((await getEmergencies("open")).counts).toBeUndefined();
  });

  // R53 t5 A2 — 위치 기록이 없을 때 서버는 position 을 null 이 아니라 {lat:null, lng:null, recorded_at:null} 객체로 준다(§5.16).
  // 그대로 통과시키면 미니 지도에 null 좌표가 그려지고 "null, null" 이 표시된다 → position 자체를 null 로 바꾼다.
  it("position 이 좌표 null 객체면 position 을 null 로 옮긴다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              raw({ position: { lat: null, lng: null, recorded_at: null } }),
              raw({ emergency_id: 2, position: { lat: 37.5, lng: 127.0, recorded_at: "2026-09-15T08:09:00" } }),
            ],
            unacked_count: 2,
          },
        }),
      ),
    );

    const result = await getEmergencies();

    expect(result.items[0].position).toBeNull();
    expect(result.items[1].position).toEqual({ lat: 37.5, lng: 127.0, recordedAt: "2026-09-15T08:09:00" });
  });
});
