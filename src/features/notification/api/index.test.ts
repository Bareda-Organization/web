import { afterEach, describe, expect, it, vi } from "vitest";
import { getAckedNotificationCount, getNotifications } from "./index";

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

  // §5.17 group=true — 묶음 항목에는 notification_id 가 없고 group_key 만 있다. 그 값을 식별자로 쓰지 않으면
  // 모든 묶음 행의 식별자가 비어 목록 행 key 가 겹친다(쪽 이동 때 행 중복·누락).
  it("묶음 항목은 group_key 를 식별자로 쓴다 — 묶음마다 서로 다르다", async () => {
    const group = (key: string) => ({
      group_key: key,
      sent_at: "2026-10-07T08:00:00+09:00",
      bus_no: "1호차",
      type: "delay",
      body: "10분 지연",
      recipient_count: 2,
      acked_count: 1,
      recipients: [{ recipient_name: "김학부모", recipient_role: "parent" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: { items: [group("delay:11:a"), group("delay:12:b")], page: 0, size: 20, total_count: 2, has_next: false, unacked_count: 1 },
        }),
      ),
    );

    const result = await getNotifications(0, 20, { group: true });

    expect(result.items.map((item) => item.notificationId)).toEqual(["delay:11:a", "delay:12:b"]);
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
        notificationId: "1",
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

// M-W4 — "수신자 확인됨" 탭 건수는 acked=true · size=1 로 읽은 total_count 다(전체 − 미확인으로 만들지 않는다).
describe("notification api — 확인됨 건수(M-W4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // §5.17 — unacked_count 는 묶지 않은 행 기준이고 total_count 는 group=true 면 묶음 기준이다. 두 탭 건수를 같은 단위(알림 행)로
  // 맞추려고 확인됨 건수는 언제나 group=false 로 읽는다.
  it("getAckedNotificationCount 는 받은 필터에 acked=true · group=false 를 붙여 total_count 만 돌려준다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { items: [], page: 0, size: 1, total_count: 7, has_next: true, unacked_count: 3 } }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const count = await getAckedNotificationCount({ type: "delay" });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(count).toBe(7);
    expect(url.searchParams.get("acked")).toBe("true");
    expect(url.searchParams.get("size")).toBe("1");
    expect(url.searchParams.get("type")).toBe("delay");
    expect(url.searchParams.get("group")).toBe("false");
  });
});
