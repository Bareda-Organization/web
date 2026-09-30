import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteTransfer, postTransfer } from "./index";

// §5.8 — stop_id·address 는 배타적이라 값이 있는 쪽만 본문에 실려야 한다(둘 다 실으면 서버가 422).
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const rawStaged = {
  success: true,
  data: {
    transfer_id: 1,
    student_id: 11,
    from_run_id: 7,
    to_run_id: 8,
    stop_id: 5,
    status: "staged",
    impact: {
      from: { rider_count_before: 6, rider_count_after: 5 },
      to: { rider_count_before: 3, rider_count_after: 4, capacity: 10 },
    },
  },
};

describe("run api — postTransfer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stopId 갈래는 stop_id 만 snake_case 로 보내고 impact 를 camelCase 로 돌려준다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(201, rawStaged));
    vi.stubGlobal("fetch", fetchMock);

    const result = await postTransfer("11", { fromRunId: "7", toRunId: "8", stopId: "5", note: "오늘만" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/staff/students/11/transfer");
    expect(JSON.parse(init.body as string)).toEqual({ from_run_id: "7", to_run_id: "8", stop_id: "5", note: "오늘만" });
    expect(result.impact).toEqual({
      from: { riderCountBefore: 6, riderCountAfter: 5 },
      to: { riderCountBefore: 3, riderCountAfter: 4, capacity: 10 },
    });
    expect(result.transferId).toBe("1");
  });

  it("address 갈래는 address 만 보내고 stop_id 는 싣지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(201, rawStaged));
    vi.stubGlobal("fetch", fetchMock);

    await postTransfer("11", { fromRunId: "7", toRunId: "8", address: "서울시 후문로 2" });

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent).toEqual({ from_run_id: "7", to_run_id: "8", address: "서울시 후문로 2" });
    expect(sent).not.toHaveProperty("stop_id");
  });
});

// §5.8.1 DELETE /staff/transfers/{transferId} — 204 본문 부재.
describe("run api — deleteTransfer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETE /staff/transfers/{id} 를 정확히 1회 보내고 본문 없는 204 를 그대로 받는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteTransfer("31")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/staff/transfers/31");
    expect(init.method).toBe("DELETE");
  });
});
