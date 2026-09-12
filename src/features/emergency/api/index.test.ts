import { afterEach, describe, expect, it, vi } from "vitest";
import { ackEmergency, getEmergencies } from "./index";

// §5.16 EXC-04 — snake_case ↔ camelCase 변환 경계. toItem 의 emergencyId 필드와
// ackEmergency 응답 조립부의 emergencyId 필드는 서로 다른 자리(하나는 목록 변환
// 함수, 하나는 단건 확인 응답 조립)에 있는 같은 형태의 문자열이라 한쪽만 깨뜨려
// 대조할 수 있다(student/api 에서 쓴 것과 같은 기법).
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("emergency api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getEmergencies 는 items[] 봉투를 옮기고 raisedBy·position·contacts 까지 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
                emergency_id: 1,
                type: "VEHICLE_FAULT",
                memo: "타이어 펑크",
                raised_by: { name: "이기사", role: "driver", phone: "010-1111-2222" },
                run_id: 7,
                bus_no: "1호차",
                direction: "to_academy",
                position: { lat: 37.5, lng: 127.1, recorded_at: "2026-09-15T08:10:00" },
                rider_count: 12,
                contacts: [{ name: "박동승", role: "escort", phone: "010-3333-4444" }],
                raised_at: "2026-09-15T08:10:00",
                acked_at: null,
                canceled_at: null,
                acked: false,
                acked_by: null,
              },
            ],
            unacked_count: 1,
          },
        }),
      ),
    );

    const result = await getEmergencies();

    expect(result.items).toEqual([
      {
        emergencyId: 1,
        type: "VEHICLE_FAULT",
        memo: "타이어 펑크",
        raisedBy: { name: "이기사", role: "driver", phone: "010-1111-2222" },
        runId: 7,
        busNo: "1호차",
        direction: "to_academy",
        position: { lat: 37.5, lng: 127.1, recordedAt: "2026-09-15T08:10:00" },
        riderCount: 12,
        contacts: [{ name: "박동승", role: "escort", phone: "010-3333-4444" }],
        raisedAt: "2026-09-15T08:10:00",
        ackedAt: null,
        canceledAt: null,
        acked: false,
        ackedBy: null,
      },
    ]);
    expect(result.unackedCount).toBe(1);
  });

  it("ackEmergency 는 emergencyId·ackedAt 만 골라 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: { emergency_id: 1, acked_at: "2026-09-15T08:12:00" },
        }),
      ),
    );

    const result = await ackEmergency(1);

    expect(result).toEqual({ emergencyId: 1, ackedAt: "2026-09-15T08:12:00" });
  });
});
