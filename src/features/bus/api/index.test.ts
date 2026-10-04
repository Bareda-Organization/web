import { afterEach, describe, expect, it, vi } from "vitest";
import { createBus, getBuses, updateBus } from "./index";

// §5.12 BUS-01·02 — snake_case 응답을 camelCase 로 바꾸는 경계(toBus)가 이 계층의
// 전부다. 필드 하나가 잘못 매핑되면 화면 전체가 엉뚱한 값을 그린다 — 브라우저 없이도
// 재현 가능한 순수 변환 로직이라 vitest.config.mts 가 말하는 대상에 해당한다.
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
              {
                id: 1, bus_no: "1호차", plate_no: "12가3456", capacity: 20, student_capacity: 15, operable: true,
                route_count: 14, schedule_count: 13,
                today_runs: [{ run_id: 501, direction: "from_academy", depart_time: "2026-10-03T13:13:00+09:00", status: "idle" }],
              },
              // 아직 새 필드를 안 주는 서버 — 0 · 빈 목록으로 견딘다.
              { id: 2, bus_no: "2호차", plate_no: "12가3457", capacity: 20, student_capacity: 15, operable: true },
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
      {
        id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 15, operable: true,
        routeCount: 14, scheduleCount: 13,
        todayRuns: [{ runId: "501", direction: "from_academy", departTime: "2026-10-03T13:13:00+09:00", status: "idle" }],
      },
      { id: "2", busNo: "2호차", plateNo: "12가3457", capacity: 20, studentCapacity: 15, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] },
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
      // 등록 응답에는 목록 전용 필드가 없다.
      routeCount: 0,
      scheduleCount: 0,
      todayRuns: [],
    });
  });

  // W5 — API_SPEC §5.12 "PATCH 응답의 warnings[]"(BR-116). 정원 축소로 기배정
  // 인원이 넘치는 회차마다 CAPACITY_BELOW_ASSIGNED 1건씩 온다.
  it("updateBus 는 응답의 warnings[] 를 camelCase 로 흡수한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, {
        success: true,
        data: {
          id: 9,
          bus_no: "9호차",
          plate_no: "99나9999",
          capacity: 10,
          student_capacity: 8,
          operable: true,
          warnings: [{ code: "CAPACITY_BELOW_ASSIGNED", run_id: 3, service_date: "2026-09-30", depart_time: "2026-09-30T08:00:00+09:00", direction: "from_academy", assigned_count: 12, student_capacity: 8 }],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateBus("9", { busNo: "9호차", plateNo: "99나9999", capacity: 10, operable: true });

    expect(result.warnings).toEqual([
      {
        code: "CAPACITY_BELOW_ASSIGNED",
        runId: "3",
        serviceDate: "2026-09-30",
        departTime: "2026-09-30T08:00:00+09:00",
        direction: "from_academy",
        assignedCount: 12,
        studentCapacity: 8,
      },
    ]);
  });
});
