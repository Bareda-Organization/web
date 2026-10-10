import { afterEach, describe, expect, it, vi } from "vitest";
import { getManagers, MANAGER_CANDIDATE_LIMIT } from "./managers";

const mockJsonResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

// R52 M9 — 배치 변경 후보는 서버 기본 쪽 크기(20)에 걸려 앞 20명만 오던 것. 역할별로 상한(§1.8, 100)까지 받고 `has_next` 를 돌려준다.
describe("run api — getManagers(배치 후보)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("역할과 쪽 크기 상한(100)을 쿼리로 보내고 has_next 를 hasNext 로 옮긴다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          items: [{ id: 3, name: "김기사", phone: "010-1111-1111", role: "driver" }],
          page: 0,
          size: 100,
          total_count: 130,
          has_next: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getManagers("driver");

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("role=driver");
    expect(url).toContain(`size=${MANAGER_CANDIDATE_LIMIT}`);
    expect(MANAGER_CANDIDATE_LIMIT).toBe(100);
    expect(result).toEqual({ items: [{ id: "3", name: "김기사", phone: "010-1111-1111", role: "driver" }], hasNext: true });
  });
});
