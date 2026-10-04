import { afterEach, describe, expect, it, vi } from "vitest";
import { getManagers } from "./index";

// §5.13 MGR-01 — snake_case ↔ camelCase 변환 경계. work_hours 는 null 가능 필드라
// 값이 있을 때·없을 때 둘 다 통과해야 한다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("manager api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getManagers 는 role·workHours 를 포함해 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
                id: 1,
                name: "이기사",
                phone: "010-2222-3333",
                role: "driver",
                work_hours: { mon: [{ start: "07:00", end: "19:00" }] },
                account_id: "7",
                assigned_run_count: 4,
                assignments: [{ run_id: 90, service_date: "2026-10-03", bus_no: "1호차", direction: "to_academy", depart_time: "2026-10-03T11:08:00+09:00", status: "finished" }],
              },
              // 아직 새 필드를 안 주는 서버 — 0 · 빈 목록으로 견딘다.
              { id: 2, name: "박동승", phone: "010-3333-4444", role: "escort", work_hours: null, account_id: null },
            ],
            counts: { assigned_today: 1, unassigned_today: 1 },
            page: 0,
            size: 20,
            total_count: 2,
            has_next: false,
          },
        }),
      ),
    );

    const result = await getManagers(0, 20);

    expect(result.items).toEqual([
      {
        id: "1",
        name: "이기사",
        phone: "010-2222-3333",
        role: "driver",
        workHours: { mon: [{ start: "07:00", end: "19:00" }] },
        accountId: "7",
        assignedRunCount: 4,
        assignments: [{ runId: "90", serviceDate: "2026-10-03", busNo: "1호차", direction: "to_academy", departTime: "2026-10-03T11:08:00+09:00", status: "finished" }],
      },
      { id: "2", name: "박동승", phone: "010-3333-4444", role: "escort", workHours: null, accountId: null, assignedRunCount: 0, assignments: [] },
    ]);
    expect(result.counts).toEqual({ assignedToday: 1, unassignedToday: 1 });
  });

  // §5.13 Ruling 817 — 역할 탭 · 오늘 배치 필터는 서버 쿼리다(화면이 가려내지 않는다).
  it("역할 · 오늘 배치 · 검색어를 쿼리로 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, { success: true, data: { items: [], page: 0, size: 20, total_count: 0, has_next: false } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getManagers(0, 20, "최", { role: "driver", assignedToday: false });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("role")).toBe("driver");
    expect(url.searchParams.get("assigned_today")).toBe("false");
    expect(url.searchParams.get("q")).toBe("최");
    expect(result.counts).toBeNull();
  });
});
