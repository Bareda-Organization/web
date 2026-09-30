import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuditLogs, getLoginHistory } from "./auditLog";

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
