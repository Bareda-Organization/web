import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuditActors, getAuditLogs, getLoginHistory } from "./auditLog";

// R37-IT — API_SPEC 전역 규약(§1, "ISO-8601 + 오프셋")상 from·to 는 시각이다. 화면의 날짜 칸이 주는
// `YYYY-MM-DD` 를 그대로 보내면 서버가 422 로 거절한다(실서버로 확인: 접속 이력 화면이 열자마자 오류).
// 날짜는 서울 기준 그날의 시작·끝으로 바꿔 보낸다.
const emptyPage = { success: true, data: { items: [], page: 0, size: 20, total_count: 0, has_next: false } };
const okResponse = () => ({ ok: true, status: 200, json: async () => emptyPage }) as Response;

const requestedUrl = (fetchMock: ReturnType<typeof vi.fn>): URL => new URL(String(fetchMock.mock.calls[0][0]));

describe("auditLog api — 날짜 조건을 ISO-8601 오프셋 시각으로 보낸다", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["getLoginHistory", getLoginHistory],
    ["getAuditLogs", getAuditLogs],
  ])("%s: 날짜 from·to 를 서울 기준 하루의 시작·끝 시각으로 바꿔 보낸다", async (_name, call) => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await call({ from: "2026-09-30", to: "2026-10-01" });

    const params = requestedUrl(fetchMock).searchParams;
    expect(params.get("from")).toBe("2026-09-30T00:00:00+09:00");
    expect(params.get("to")).toBe("2026-10-01T23:59:59+09:00");
  });

  it("조건이 비어 있으면 from·to 를 보내지 않는다(전체 기간)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await getLoginHistory({});

    const params = requestedUrl(fetchMock).searchParams;
    expect(params.has("from")).toBe(false);
    expect(params.has("to")).toBe(false);
  });
});

// R46 감사 화면(Ruling 446·447)
describe("auditLog api — 동작 필터와 행위자 찾기", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAuditLogs: action 을 쿼리로 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await getAuditLogs({ action: "update" });

    expect(requestedUrl(fetchMock).searchParams.get("action")).toBe("update");
  });

  it("getAuditActors: q 를 보내고 응답을 화면 모양으로 바꾼다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { items: [{ account_id: "55", name: "김관계", login_id: "kim_staff", role: "staff", academy_name: "바래다학원" }] },
      }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const actors = await getAuditActors("김관");

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toMatch(/\/admin\/audit-actors$/);
    expect(url.searchParams.get("q")).toBe("김관");
    expect(actors).toEqual([{ accountId: "55", name: "김관계", loginId: "kim_staff", role: "staff", academyName: "바래다학원" }]);
  });
});
