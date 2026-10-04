import { describe, expect, it } from "vitest";
import { pathFigures, riderFigures } from "./routeStats";

// 편성 상세의 지표 — 이용 학생(정차지 rider_count 합) · 예상 소요/거리(path). 직선 근사는 도로 거리로 보이지 않는다(Ruling 819).
describe("riderFigures — 이용 학생", () => {
  it("합과 정차지당 최소·최대를 낸다. 서버가 안 주면 null", () => {
    expect(riderFigures([{ riderCount: 2 }, { riderCount: 1 }, { riderCount: 3 }])).toEqual({ total: 6, min: 1, max: 3 });
    expect(riderFigures([{}, {}])).toBeNull();
    expect(riderFigures([])).toBeNull();
  });
});

describe("pathFigures — 예상 소요 · 거리", () => {
  it("초는 분으로, 미터는 km 한 자리로 — 근사(null)면 숨긴다", () => {
    expect(pathFigures({ durationS: 1990, distanceM: 12400, computedAt: "2026-10-03T12:02:00+09:00" })).toEqual({ minutes: 33, km: "12.4", computedAt: "2026-10-03T12:02:00+09:00" });
    expect(pathFigures({ durationS: null, distanceM: null, computedAt: "2026-10-03T12:02:00+09:00" })).toBeNull();
    expect(pathFigures(undefined)).toBeNull();
  });
});
