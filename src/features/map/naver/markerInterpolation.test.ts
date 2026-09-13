import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERPOLATION_DURATION_MS,
  MAX_INTERPOLATION_DURATION_MS,
  clampProgress,
  interpolateLatLng,
  resolveInterpolationDurationMs,
} from "./markerInterpolation";

const START = { lat: 37.5, lng: 127.0 };
const END = { lat: 37.6, lng: 127.2 };

describe("interpolateLatLng — 진행률에 따른 선형 보간", () => {
  it("진행률 0 이면 시작 좌표를 그대로 돌려준다", () => {
    expect(interpolateLatLng(START, END, 0)).toEqual(START);
  });

  it("진행률 1 이면 목표 좌표를 그대로 돌려준다", () => {
    expect(interpolateLatLng(START, END, 1)).toEqual(END);
  });

  it("진행률 0.5 면 두 좌표의 중점이다", () => {
    const mid = interpolateLatLng(START, END, 0.5);
    expect(mid.lat).toBeCloseTo((START.lat + END.lat) / 2);
    expect(mid.lng).toBeCloseTo((START.lng + END.lng) / 2);
  });

  it("진행률이 1 을 넘겨 들어와도 목표 좌표를 넘어가지 않는다", () => {
    // 다음 좌표가 늦게 도착해 진행률 계산이 1 을 넘길 수 있다 — 그래도 마커가
    // 목표 지점을 지나쳐 가면 안 된다(COMMON-B2 §2).
    expect(interpolateLatLng(START, END, 1.8)).toEqual(END);
  });

  it("진행률이 음수로 들어와도 시작 좌표 아래로 내려가지 않는다", () => {
    expect(interpolateLatLng(START, END, -0.3)).toEqual(START);
  });
});

describe("clampProgress", () => {
  it("0~1 범위를 벗어나면 잘라낸다", () => {
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(2)).toBe(1);
    expect(clampProgress(0.42)).toBe(0.42);
  });
});

describe("resolveInterpolationDurationMs — 수신 간격 → 보간 지속시간", () => {
  it("첫 좌표(간격 없음)는 기본값을 쓴다", () => {
    expect(resolveInterpolationDurationMs(null)).toBe(DEFAULT_INTERPOLATION_DURATION_MS);
  });

  it("정상 범위의 간격은 받은 값 그대로 쓴다", () => {
    expect(resolveInterpolationDurationMs(2000)).toBe(2000);
    expect(resolveInterpolationDurationMs(500)).toBe(500);
  });

  it("상한을 넘는 간격은 null 을 돌려준다 — 보간 없이 즉시 이동해야 한다는 신호", () => {
    expect(resolveInterpolationDurationMs(MAX_INTERPOLATION_DURATION_MS + 1)).toBeNull();
    expect(resolveInterpolationDurationMs(30000)).toBeNull();
  });

  it("상한과 정확히 같은 간격은 아직 보간 대상이다", () => {
    expect(resolveInterpolationDurationMs(MAX_INTERPOLATION_DURATION_MS)).toBe(MAX_INTERPOLATION_DURATION_MS);
  });
});
