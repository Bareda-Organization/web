import { describe, expect, it } from "vitest";
import type { TimetableRun } from "./timetable";
import { barGeometry, timetableRange } from "./timetable";

const run = (patch: Partial<TimetableRun> = {}): TimetableRun => ({ departTime: "2026-10-03T12:20:00+09:00", ...patch });

// 오늘 현황(run)에 있던 시간표 막대 시험을 공용으로 올린 것 — 판정은 그대로다(Ruling 827).
describe("timetableRange · barGeometry — 시간표 막대", () => {
  const runs = [
    run({ departTime: "2026-10-03T11:08:00+09:00", startedAt: "2026-10-03T11:09:00+09:00", finishedAt: "2026-10-03T11:47:00+09:00" }),
    run({ departTime: "2026-10-03T14:53:00+09:00", estArrivalTime: "2026-10-03T15:30:00+09:00" }),
  ];

  it("가장 이른 출발의 정시부터 가장 늦은 도착의 다음 정시까지를 범위로 잡는다", () => {
    const range = timetableRange(runs);
    expect(new Date(range.startMs).toISOString()).toBe("2026-10-03T02:00:00.000Z"); // 11:00 KST
    expect(new Date(range.endMs).toISOString()).toBe("2026-10-03T07:00:00.000Z"); // 16:00 KST
  });

  it("도착 예정이 null 이면 기본 길이만큼 막대를 그린다(Ruling 827)", () => {
    const range = timetableRange(runs);
    const geometry = barGeometry(run({ departTime: "2026-10-03T13:00:00+09:00" }), range);
    // 13:00 → 11:00 시작 + 120분 / 300분 = 40%
    expect(geometry.leftPct).toBeCloseTo(40, 5);
    expect(geometry.widthPct).toBeGreaterThan(0);
  });

  it("실제 출발·도착이 있으면 예정이 아니라 실제 구간을 그린다", () => {
    const range = timetableRange(runs);
    const geometry = barGeometry(runs[0], range);
    // 11:09 → 11:47 : (9 / 300) · (38 / 300)
    expect(geometry.leftPct).toBeCloseTo(3, 5);
    expect(geometry.widthPct).toBeCloseTo((38 / 300) * 100, 5);
  });

  it("도착 예정이 없고 예상 소요(분)가 있으면 그 길이만큼 그린다 — 일일 회차(§5.10)", () => {
    const range = timetableRange(runs);
    const geometry = barGeometry(run({ departTime: "2026-10-03T13:00:00+09:00", estDurationMin: 60 }), range);
    expect(geometry.leftPct).toBeCloseTo(40, 5);
    expect(geometry.widthPct).toBeCloseTo((60 / 300) * 100, 5);
  });

  it("시각을 읽을 수 없는 회차는 막대를 그리지 않고 범위 계산에서도 뺀다", () => {
    const range = timetableRange([...runs, run({ departTime: "08:00" })]);
    expect(new Date(range.startMs).toISOString()).toBe("2026-10-03T02:00:00.000Z");
    expect(barGeometry(run({ departTime: "08:00" }), range)).toEqual({ leftPct: 0, widthPct: 0 });
  });
});
