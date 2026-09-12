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
              },
              { id: 2, name: "박동승", phone: "010-3333-4444", role: "escort", work_hours: null },
            ],
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
        id: 1,
        name: "이기사",
        phone: "010-2222-3333",
        role: "driver",
        workHours: { mon: [{ start: "07:00", end: "19:00" }] },
      },
      { id: 2, name: "박동승", phone: "010-3333-4444", role: "escort", workHours: null },
    ]);
  });
});
