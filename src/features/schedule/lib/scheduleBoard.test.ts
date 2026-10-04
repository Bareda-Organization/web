import { describe, expect, it } from "vitest";
import type { RunItemResponseTypes, ScheduleItemResponseTypes } from "../types";
import { buildScheduleGrid, previewScheduleChange, summarizeSchedules } from "./scheduleBoard";

const TODAY = "2026-10-03"; // 토요일
const s = (id: string, busId: string, weekday: ScheduleItemResponseTypes["weekday"], direction: ScheduleItemResponseTypes["direction"], over: Partial<ScheduleItemResponseTypes> = {}): ScheduleItemResponseTypes =>
  ({ id, busId, busNo: `${busId}호차`, weekday, direction, departTime: "12:41", originName: "중동 마을", destinationName: "하늘수학학원", estDurationMin: 30, active: true, routeStopCount: 10, ...over }) as ScheduleItemResponseTypes;

describe("buildScheduleGrid · summarizeSchedules — 요일표", () => {
  const schedules = [s("1", "1", "mon", "to_academy"), s("2", "1", "sat", "from_academy", { routeStopCount: 0 }), s("3", "2", "wed", "to_academy", { active: false }), s("4", "2", "sun", "to_academy", { routeStopCount: null })];
  it("(차량, 방향, 요일) 칸에 놓고 편성이 없는 차량도 머리 줄을 남긴다", () => {
    const rows = buildScheduleGrid(schedules, [{ id: "1", busNo: "1호차" }, { id: "3", busNo: "3호차" }]);
    expect(rows[0].cells.to_academy.mon?.id).toBe("1");
    expect(rows[0].cells.from_academy.sat?.id).toBe("2");
    expect(rows[1].hasSchedules).toBe(false);
  });
  it("노선이 비어 있는 스케줄(활성인데 route_stop_count 0)만 센다 — 편성이 없어 null 인 것은 비어 있다고 단정하지 않는다", () => {
    const summary = summarizeSchedules(schedules);
    expect(summary).toMatchObject({ total: 4, inactive: 1, busCount: 2 });
    expect(summary.emptyRoute.map((x) => x.id)).toEqual(["2"]);
  });
});

// R48-WEB-STAFF 스케줄 수정 미리보기 — §5.10 반영 규칙(Ruling 366)을 화면이 계산한다(Ruling 827). G2: 오늘 회차 불변 · 내일 요일 일치 시 반영.
describe("previewScheduleChange — 이 수정이 반영되는 회차", () => {
  const sat = s("9", "3", "sat", "to_academy");
  const todayRun = { id: "r1", scheduleId: "9", serviceDate: TODAY, direction: "to_academy", departTime: "2026-10-03T12:41:00+09:00", status: "confirmed", canceledAt: null } as unknown as RunItemResponseTypes;

  it("오늘 회차는 어떤 수정에도 바뀌지 않는다 — 오늘 이 스케줄의 회차를 있는 그대로 보인다", () => {
    const preview = previewScheduleChange(sat, { ...sat, departTime: "13:00", active: false }, [todayRun], TODAY);
    expect(preview.today.kind).toBe("unchanged");
    expect(preview.today.runs).toEqual([{ departTime: "2026-10-03T12:41:00+09:00", status: "confirmed" }]);
  });

  it("토요일 스케줄이라 내일(일) 회차에는 영향이 없고, 다음 토요일에 새 값으로 회차가 만들어진다", () => {
    const preview = previewScheduleChange(sat, { ...sat, departTime: "13:00" }, [todayRun], TODAY);
    expect(preview.tomorrow).toMatchObject({ kind: "none", weekday: "sun" });
    expect(preview.next).toMatchObject({ date: "2026-10-10", createdOn: "2026-10-09", active: true });
  });

  it("내일 요일과 일치하면 값이 바뀔 때 그 회차에 반영되고, 비활성이면 임시 취소, 아무것도 안 바뀌면 변경 없음", () => {
    const sun = s("8", "3", "sun", "to_academy");
    expect(previewScheduleChange(sun, { ...sun, departTime: "13:00" }, [], TODAY).tomorrow.kind).toBe("moved");
    expect(previewScheduleChange(sun, { ...sun, active: false }, [], TODAY).tomorrow.kind).toBe("canceled");
    expect(previewScheduleChange(sun, { ...sun }, [], TODAY).tomorrow.kind).toBe("same");
  });

  it("요일을 내일 요일로 바꾸면 내일 회차가 새로 만들어진다", () => {
    expect(previewScheduleChange(sat, { ...sat, weekday: "sun" }, [], TODAY).tomorrow.kind).toBe("created");
  });
});
