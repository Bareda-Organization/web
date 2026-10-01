import { describe, expect, it } from "vitest";
import { countSchedulesWithoutRoute } from "./setupProgress";

const route = (busId: string, weekday: string, direction: string, active = true) => ({ busId, weekday, direction, active });
const schedule = (busId: string, weekday: string, direction: string, active = true) => ({ busId, weekday, direction, active });

// B1 #9 — 노선 없이 스케줄만 있으면 그 회차는 "고정 노선이 없습니다" 가 된다. 차량·요일·방향이 같은 활성 노선이 있어야 짝이 맞는다.
describe("countSchedulesWithoutRoute", () => {
  it("차량·요일·방향이 같은 활성 노선이 없는 활성 스케줄만 센다", () => {
    const count = countSchedulesWithoutRoute(
      [schedule("1", "mon", "to_academy"), schedule("1", "tue", "to_academy"), schedule("2", "mon", "to_academy", false)],
      [route("1", "mon", "to_academy")],
    );
    expect(count).toBe(1); // 화요일만 짝이 없다 · 비활성 스케줄은 세지 않는다
  });

  it("활성이 아닌 노선은 짝으로 치지 않는다", () => {
    expect(countSchedulesWithoutRoute([schedule("1", "mon", "to_academy")], [route("1", "mon", "to_academy", false)])).toBe(1);
  });
});
