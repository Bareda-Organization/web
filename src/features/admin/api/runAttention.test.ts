import { afterEach, describe, expect, it, vi } from "vitest";
import { getRunAttention } from "./runAttention";

const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("getRunAttention — GET /admin/runs/attention (§6.15)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("학원별 지연·확정 실패 건수를 camelCase 로 옮기고 학원 식별자는 문자열로 바꾼다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, {
        success: true,
        data: { items: [{ academy_id: 7, delayed_runs: 2, confirm_failed_runs: 0 }] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRunAttention();

    expect(result.items).toEqual([{ academyId: "7", delayedRuns: 2, confirmFailedRuns: 0 }]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/admin/runs/attention");
  });
});
