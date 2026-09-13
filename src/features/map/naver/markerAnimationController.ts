// 마커 보간 스케줄러 — 순수 계산(`markerInterpolation.ts`)을 프레임 루프에 연결한다.
// SDK 를 전혀 참조하지 않는다: 좌표를 실제로 반영하는 방법은 `applyPosition` 콜백으로
// 주입받고, 지금 화면에 표시된 좌표는 `getCurrentPosition` 콜백으로 물어본다. 그래서
// 이 클래스는 jsdom 조차 없이 순수 단위 시험이 가능하다 — `F4-B COMMON-B2 §2` 가
// 요구하는 "보간 계산을 순수 함수로 빼서 검사로 고정" 을 스케줄링까지 확장한 것이다.
//
// ⚠ 마커를 움직이는 것이지 카메라를 움직이는 것이 아니다 — `NaverMapSurface` 는 이
// 컨트롤러를 마커 좌표 갱신에만 연결한다. 카메라는 별도 useEffect 가 즉시 갱신한다.
import {
  interpolateLatLng,
  resolveInterpolationDurationMs,
  type LatLng,
} from "./markerInterpolation";

// 프레임 타이머 — 기본은 `requestAnimationFrame`/`cancelAnimationFrame` 이지만,
// 단위 시험에서는 가짜 스케줄러를 주입해 시간을 직접 제어한다.
export type FrameScheduler = {
  requestFrame: (callback: (now: number) => void) => number;
  cancelFrame: (handle: number) => void;
  now: () => number;
};

const browserScheduler: FrameScheduler = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
  now: () => performance.now(),
};

type AnimationState = {
  from: LatLng;
  to: LatLng;
  startedAt: number;
  durationMs: number;
};

export type MarkerAnimationControllerDeps = {
  applyPosition: (id: string, position: LatLng) => void;
  getCurrentPosition: (id: string) => LatLng | undefined;
  scheduler?: FrameScheduler;
};

export class MarkerAnimationController {
  private readonly applyPosition: (id: string, position: LatLng) => void;
  private readonly getCurrentPosition: (id: string) => LatLng | undefined;
  private readonly scheduler: FrameScheduler;
  private readonly lastReceivedAt = new Map<string, number>();
  private readonly animating = new Map<string, AnimationState>();
  private frameHandle: number | null = null;

  constructor(deps: MarkerAnimationControllerDeps) {
    this.applyPosition = deps.applyPosition;
    this.getCurrentPosition = deps.getCurrentPosition;
    this.scheduler = deps.scheduler ?? browserScheduler;
  }

  // 새 좌표 수신 — 직전 수신과의 간격으로 보간 시간을 정하고, 지금 표시 중인
  // 위치(`getCurrentPosition`)에서 새 목표까지 보간을 시작한다. 진행 중이던
  // 이동이 있으면 그 자리에서 그대로 이어진다(중간에 튀지 않는다).
  receive(id: string, next: LatLng): void {
    const now = this.scheduler.now();
    const previousReceivedAt = this.lastReceivedAt.get(id);
    const intervalMs = previousReceivedAt == null ? null : now - previousReceivedAt;
    this.lastReceivedAt.set(id, now);

    const durationMs = resolveInterpolationDurationMs(intervalMs);
    if (durationMs == null) {
      // 상한 초과 — 통신 두절 복귀로 보고 보간 없이 즉시 이동시킨다.
      this.animating.delete(id);
      this.applyPosition(id, next);
      return;
    }

    const from = this.getCurrentPosition(id) ?? next;
    this.animating.set(id, { from, to: next, startedAt: now, durationMs });
    this.ensureLoop();
  }

  // 목록에서 사라진 마커 — 다음 보간 대상에서 제외한다.
  forget(id: string): void {
    this.lastReceivedAt.delete(id);
    this.animating.delete(id);
  }

  // 화면이 사라질 때 반드시 호출한다 — 안 부르면 프레임 루프가 계속 돈다(누수).
  dispose(): void {
    if (this.frameHandle != null) {
      this.scheduler.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.animating.clear();
    this.lastReceivedAt.clear();
  }

  get isRunning(): boolean {
    return this.frameHandle != null;
  }

  private ensureLoop(): void {
    if (this.frameHandle != null) return;
    this.frameHandle = this.scheduler.requestFrame(this.tick);
  }

  private tick = (now: number): void => {
    let stillAnimating = false;
    for (const [id, state] of this.animating) {
      const progress = (now - state.startedAt) / state.durationMs;
      const position = interpolateLatLng(state.from, state.to, progress);
      this.applyPosition(id, position);
      if (progress >= 1) {
        this.animating.delete(id);
      } else {
        stillAnimating = true;
      }
    }
    if (stillAnimating) {
      this.frameHandle = this.scheduler.requestFrame(this.tick);
    } else {
      this.frameHandle = null;
    }
  };
}
