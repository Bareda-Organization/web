import { describe, expect, it } from "vitest";
import { routeColorFor } from "./routeColor";

// R20-C 목표 3 — 회차 상태 3종(운행 중·운행 종료·확정)의 경로 색이 서로 다르다.
// idle 은 노선 자체가 없어(routeDisplayState.ts) kind 목록에 없다.
describe("routeColorFor — 상태별 경로 색(R20-C 목표 3)", () => {
  it("moving·finished·confirmed 색이 서로 다르다", () => {
    const colors = new Set([routeColorFor("moving"), routeColorFor("finished"), routeColorFor("confirmed")]);
    expect(colors.size).toBe(3);
  });

  it("route(기존 kind)는 이전 색을 그대로 유지한다 — features/approval(B) 이 이 값을 쓴다", () => {
    expect(routeColorFor("route")).toBe("#2563eb");
  });

  // Ruling 321 — 예정 경로는 확정 경로 3종과 색이 겹치면 안 된다(오인 방지).
  it("planned(예정)는 confirmed·moving·finished 어느 색과도 겹치지 않는다", () => {
    const confirmedColors = new Set([routeColorFor("moving"), routeColorFor("finished"), routeColorFor("confirmed")]);
    expect(confirmedColors.has(routeColorFor("planned"))).toBe(false);
  });
});
