import { afterEach, describe, expect, it, vi } from "vitest";
import { getManagerSignupPendingCount } from "./signupRequests";

const jsonResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => ({ success: true, data: body }) }) as Response;

// R50 S13 · Ruling 846 ① — 매니저 관리의 "가입 승인 대기 N건" 은 기사·동승자 요청만 센다. §5.1 `role` 은 반복 키다.
describe("getManagerSignupPendingCount — 기사·동승자 가입 대기 건수", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("status=pending · role=driver · role=escort 를 실어 한 번 묻고 total_count 를 돌려준다(pending_count 가 아니다)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ items: [], page: 0, size: 1, total_count: 2, has_next: true, pending_count: 9 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const count = await getManagerSignupPendingCount();

    expect(count).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toMatch(/\/staff\/signup-requests$/);
    expect(url.searchParams.get("status")).toBe("pending");
    expect(url.searchParams.getAll("role")).toEqual(["driver", "escort"]);
  });
});
