import { afterEach, describe, expect, it, vi } from "vitest";
import { getEmergencies } from "./emergencies";

const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

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
});
