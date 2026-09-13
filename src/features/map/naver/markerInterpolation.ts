// 버스 마커 보간의 순수 계산 — `features/map/naver/` 안에서만 쓴다(어댑터 경계,
// `mapAdapterBoundary.test.ts`). SDK 타입(`naver.maps.*`)을 전혀 참조하지 않으므로
// `MarkerAnimationController`·`NaverMapSurface` 양쪽에서 가져다 쓰고 단위 시험으로
// 고정한다 — `F4-B COMMON-B2 §2`.
export type LatLng = { lat: number; lng: number };

// 첫 좌표 수신이라 직전 간격을 모를 때 쓰는 기본 보간 시간. COMMON-B2 §2 사용자
// 결정("첫 좌표면 2초를 기본값으로")을 그대로 따른다.
export const DEFAULT_INTERPOLATION_DURATION_MS = 2000;

// 이 값을 넘는 수신 간격은 "통신 두절 후 복귀"로 본다. 위치 전송 주기가 2초로
// 바뀌었으므로(COMMON-B2 §2) 그 4배를 상한으로 잡았다 — 정상적인 지연·지터는
// 흡수하되, 연결이 끊겼다 돌아온 뒤의 수십 초짜리 간격을 그대로 보간하면 마커가
// 멈춘 것과 구별되지 않을 만큼 느리게 기어간다(COMMON-B2 §2 가 지적한 문제).
export const MAX_INTERPOLATION_DURATION_MS = 8000;

// 진행률을 0~1 로 가둔다 — 다음 좌표가 늦게 와도 마커가 목표를 지나쳐 가지 않는다.
export const clampProgress = (progress: number): number => Math.min(1, Math.max(0, progress));

// 두 좌표 사이를 진행률만큼 선형 보간한다.
export const interpolateLatLng = (from: LatLng, to: LatLng, progress: number): LatLng => {
  const p = clampProgress(progress);
  return {
    lat: from.lat + (to.lat - from.lat) * p,
    lng: from.lng + (to.lng - from.lng) * p,
  };
};

// 직전 좌표 수신 이후 경과 시간(ms)으로 보간 지속시간을 정한다.
// - 첫 좌표(간격을 모름) → 기본값
// - 상한 초과 → `null` (호출자가 "보간 없이 즉시 이동"으로 처리해야 한다는 신호)
// - 그 외 → 받은 간격 그대로(최소 1ms — 0 이면 나눗셈에서 진행률이 정의되지 않는다)
export const resolveInterpolationDurationMs = (intervalMs: number | null): number | null => {
  if (intervalMs == null) return DEFAULT_INTERPOLATION_DURATION_MS;
  if (intervalMs > MAX_INTERPOLATION_DURATION_MS) return null;
  return Math.max(intervalMs, 1);
};
