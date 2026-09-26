import { afterEach, describe, expect, it, vi } from "vitest";
import { createBus, getBuses } from "./index";

// §5.12 BUS-01·02 — snake_case 응답을 camelCase 로 바꾸는 경계(toBus)가 이 계층의
// 전부다. 필드 하나가 잘못 매핑되면 화면 전체가 엉뚱한 값을 그린다 — 브라우저 없이도
// 재현 가능한 순수 변환 로직이라 vitest.config.ts 가 말하는 대상에 해당한다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("bus api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getBuses 는 목록·페이징 필드를 전부 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              { id: 1, bus_no: "1호차", plate_no: "12가3456", capacity: 20, student_capacity: 15, operable: true },
            ],
            page: 0,
            size: 20,
            total_count: 1,
            has_next: false,
          },
        }),
      ),
    );

    const result = await getBuses(0, 20);

    expect(result.items).toEqual([
      { id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 15, operable: true },
    ]);
    expect(result.totalCount).toBe(1);
    expect(result.hasNext).toBe(false);
  });

  it("createBus 는 요청 본문을 snake_case 로 보내고 응답을 camelCase 로 되돌린다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, {
        success: true,
        data: { id: 9, bus_no: "9호차", plate_no: "99나9999", capacity: 25, student_capacity: 20, operable: false },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createBus({ busNo: "9호차", plateNo: "99나9999", capacity: 25, operable: false });

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toEqual({ bus_no: "9호차", plate_no: "99나9999", capacity: 25, operable: false });
    expect(result).toEqual({
      id: "9",
      busNo: "9호차",
      plateNo: "99나9999",
      capacity: 25,
      studentCapacity: 20,
      operable: false,
    });
  });
});
