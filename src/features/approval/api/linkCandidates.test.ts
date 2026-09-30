import { afterEach, describe, expect, it, vi } from "vitest";
import { searchManagerCandidates } from "./linkCandidates";

const jsonResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => ({ success: true, data: body }) }) as Response;

const manager = (id: number, role: string, accountId: number | null) => ({
  id,
  name: `매니저${id}`,
  phone: "010-0000-0000",
  role,
  account_id: accountId,
});

// F02-02 — 서버는 역할·연결 여부 필터가 없다. 한 쪽만 받아 거르면 연결 가능한 매니저가 다음 쪽에 있을 때 목록에서 사라진다.
describe("searchManagerCandidates — F02-02 다음 쪽까지 찾는다", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("첫 쪽이 전부 연결된 매니저여도 다음 쪽의 연결 가능한 매니저를 후보로 낸다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: Array.from({ length: 100 }, (_, index) => manager(index + 1, "driver", 9)),
          page: 0,
          size: 100,
          total_count: 101,
          has_next: true,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [manager(101, "driver", null)], page: 1, size: 100, total_count: 101, has_next: false }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await searchManagerCandidates("driver");

    expect(candidates.map((candidate) => candidate.name)).toEqual(["매니저101"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("다른 역할이거나 이미 연결된 매니저는 후보에서 뺀다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [manager(1, "escort", null), manager(2, "driver", 5), manager(3, "driver", null)],
          page: 0,
          size: 100,
          total_count: 3,
          has_next: false,
        }),
      ),
    );

    const candidates = await searchManagerCandidates("driver");

    expect(candidates.map((candidate) => candidate.name)).toEqual(["매니저3"]);
  });
});
