import { afterEach, describe, expect, it, vi } from "vitest";
import { getAcademies, getAllAcademies } from "./academies";
import { getAuditLogs, getLoginHistory } from "./auditLog";
import { getBlockedAccounts } from "./blockedAccounts";
import { getStaffAccounts } from "./staffAccounts";
import { getStaffSignupRequests } from "./signupRequests";

// F03-04 — §1.8: 목록은 page(0 기점)·size 를 받는다. 안 넘기면 서버는 첫 20건만 준다.
const respond = (items: unknown[], hasNext = false, totalCount = items.length) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { items, page: 0, size: 20, total_count: totalCount, has_next: hasNext } }),
  }) as Response;

const stubFetch = (...responses: Response[]) => {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const urlOf = (fetchMock: ReturnType<typeof vi.fn>, call = 0) => new URL(String(fetchMock.mock.calls[call][0]));

describe("관리자 목록 API — 쪽 번호를 서버에 싣는다", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["학원", () => getAcademies(undefined, undefined, { page: 2, size: 50 }), "/admin/academies"],
    ["가입 요청", () => getStaffSignupRequests({ page: 2, size: 50 }), "/admin/staff-signup-requests"],
    ["관계자 계정", () => getStaffAccounts({ page: 2, size: 50 }), "/admin/staff-accounts"],
    ["차단 계정", () => getBlockedAccounts({ page: 2, size: 50 }), "/admin/blocked-accounts"],
    ["감사 로그", () => getAuditLogs({ page: 2, size: 50 }), "/admin/audit-logs"],
    ["접속 이력", () => getLoginHistory({ page: 2, size: 50 }), "/admin/login-history"],
  ])("%s 목록은 page·size 쿼리를 싣는다", async (_name, call, path) => {
    const fetchMock = stubFetch(respond([]));

    await call();

    const url = urlOf(fetchMock);
    expect(url.pathname.endsWith(path)).toBe(true);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("size")).toBe("50");
  });

  it("getAllAcademies 는 다음 쪽이 없을 때까지 100건씩 모아 온다 — 21번째 이후 학원이 선택 목록에서 빠지지 않는다", async () => {
    const academy = (id: number) => ({ id, code: `A${id}`, name: `학원${id}`, region: "서울", staff_count: 0, user_count: 0, status: "active" });
    const fetchMock = stubFetch(
      respond([academy(1), academy(2)], true, 3),
      respond([academy(3)], false, 3),
    );

    const all = await getAllAcademies();

    expect(all.map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(urlOf(fetchMock, 0).searchParams.get("size")).toBe("100");
    expect(urlOf(fetchMock, 1).searchParams.get("page")).toBe("1");
  });
});
