import { afterEach, describe, expect, it, vi } from "vitest";
import { createSchedule, getRuns, getSchedules } from "./index";

// §5.10 SCH-01~03 — snake_case ↔ camelCase 변환 경계. toSchedule 과 toRun 은
// 서로 다른 함수지만 둘 다 `originName: raw.origin_name,` 형태를 가진다 —
// 한쪽만 깨뜨려 두 테스트가 실제로 다른 변환 함수를 검사하는지 대조할 수 있다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("schedule api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getSchedules 는 목록 항목 필드를 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
                id: 1,
                bus_id: 3,
                weekday: "mon",
                direction: "to_academy",
                depart_time: "08:00",
                origin_name: "정문",
                destination_name: "학원",
                est_duration_min: 20,
                active: true,
              },
            ],
            page: 0,
            size: 20,
            total_count: 1,
            has_next: false,
          },
        }),
      ),
    );

    const result = await getSchedules(0, 20);

    expect(result.items).toEqual([
      {
        id: 1,
        busId: 3,
        weekday: "mon",
        direction: "to_academy",
        departTime: "08:00",
        originName: "정문",
        destinationName: "학원",
        estDurationMin: 20,
        active: true,
      },
    ]);
  });

  it("getRuns 는 맨 배열 응답을 items 로 감싸고 assignments 까지 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: [
            {
              id: 1,
              bus_id: 3,
              schedule_id: 1,
              service_date: "2026-09-15",
              direction: "to_academy",
              depart_time: "08:00",
              confirm_at: "2026-09-15T07:30:00",
              status: "idle",
              origin_name: "정문",
              destination_name: "학원",
              est_duration_min: 20,
              canceled_at: null,
              assignments: [{ manager_id: 5, name: "이기사", role: "driver" }],
            },
          ],
        }),
      ),
    );

    const result = await getRuns("2026-09-15");

    expect(result.items).toEqual([
      {
        id: 1,
        busId: 3,
        scheduleId: 1,
        serviceDate: "2026-09-15",
        direction: "to_academy",
        departTime: "08:00",
        confirmAt: "2026-09-15T07:30:00",
        status: "idle",
        originName: "정문",
        destinationName: "학원",
        estDurationMin: 20,
        canceledAt: null,
        assignments: [{ managerId: 5, name: "이기사", role: "driver" }],
      },
    ]);
  });

  it("createSchedule 은 요청 본문을 snake_case 로 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, {
        success: true,
        data: {
          id: 9,
          bus_id: 3,
          weekday: "tue",
          direction: "from_academy",
          depart_time: "17:00",
          origin_name: "학원",
          destination_name: "정문",
          est_duration_min: null,
          active: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createSchedule({
      busId: 3,
      weekday: "tue",
      direction: "from_academy",
      departTime: "17:00",
      originName: "학원",
      destinationName: "정문",
    });

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toEqual({
      bus_id: 3,
      weekday: "tue",
      direction: "from_academy",
      depart_time: "17:00",
      origin_name: "학원",
      destination_name: "정문",
    });
  });
});
