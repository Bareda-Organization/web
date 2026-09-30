import { afterEach, describe, expect, it, vi } from "vitest";
import { getRunRoster } from "./index";

const mockJsonResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

const rawRow = {
  student_id: 1,
  name: "김학생",
  class_name: "1반",
  stop_name: "정문",
  guardian_phone: null,
  change: null,
  status: "waiting",
  note: null,
};

// §5.4 — `transfer_id`(이동 대기 행에만, Ruling 369)와 `stop_name: null`(승하차지 미지정 — 예정 명단).
describe("run api — getRunRoster", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("transfer_id 가 있으면 문자열 transferId 로, 없으면 null 로 옮긴다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse({ success: true, data: [{ ...rawRow, change: "added", transfer_id: 31 }, rawRow] }),
      ),
    );

    const [staged, plain] = await getRunRoster("7");

    expect(staged.transferId).toBe("31");
    expect(plain.transferId).toBeNull();
  });

  it("stop_name 이 null 이면 stopName 도 null 로 그대로 둔다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ success: true, data: [{ ...rawRow, stop_name: null }] })),
    );

    const [row] = await getRunRoster("7");

    expect(row.stopName).toBeNull();
  });
});
