import { afterEach, describe, expect, it, vi } from "vitest";
import { getNotifications } from "./index";

// §5.17 NTF-10·11 — snake_case ↔ camelCase 변환 경계. 조회 전용 화면이라 변환
// 함수가 toItem 하나뿐이라 다른 기능처럼 두 함수를 대조하는 기법은 적용 대상이
// 아니다(§2 확신 없는 지점) — 대신 busNo 가 null 인 경계값과 필터 쿼리 전달을
// 각각 검사해 커버리지를 나눈다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("notification api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getNotifications 는 busNo 가 null 인 항목도 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
                notification_id: 1,
                sent_at: "2026-09-15T08:00:00",
                bus_no: null,
                recipient_name: "김학부모",
                recipient_role: "guardian",
                type: "boarding",
                body: "승차 완료",
                acked: true,
              },
            ],
            page: 0,
            size: 20,
            total_count: 1,
            has_next: false,
            unacked_count: 0,
          },
        }),
      ),
    );

    const result = await getNotifications(0, 20);

    expect(result.items).toEqual([
      {
        notificationId: 1,
        sentAt: "2026-09-15T08:00:00",
        busNo: null,
        recipientName: "김학부모",
        recipientRole: "guardian",
        type: "boarding",
        body: "승차 완료",
        acked: true,
      },
    ]);
    expect(result.unackedCount).toBe(0);
  });

  it("getNotifications 는 type·date·acked 필터를 쿼리로 그대로 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, {
        success: true,
        data: { items: [], page: 0, size: 20, total_count: 0, has_next: false, unacked_count: 0 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getNotifications(0, 20, { type: "emergency", date: "2026-09-15", acked: false });

    const [url] = fetchMock.mock.calls[0];
    const calledUrl = String(url);
    expect(calledUrl).toContain("type=emergency");
    expect(calledUrl).toContain("date=2026-09-15");
    expect(calledUrl).toContain("acked=false");
  });
});
