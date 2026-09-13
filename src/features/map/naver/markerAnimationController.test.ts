import { describe, expect, it } from "vitest";
import { MarkerAnimationController, type FrameScheduler } from "./markerAnimationController";
import { MAX_INTERPOLATION_DURATION_MS, type LatLng } from "./markerInterpolation";

// 실제 requestAnimationFrame 대신 시간을 직접 제어하는 가짜 스케줄러 — 콜백을
// 큐에 쌓아 두고 `advance(ms)` 로 원하는 만큼만 시간을 흘려보낸다.
class FakeScheduler implements FrameScheduler {
  private nowMs = 0;
  private pending: ((now: number) => void) | null = null;
  private nextHandle = 1;
  public cancelCount = 0;

  now(): number {
    return this.nowMs;
  }

  requestFrame(callback: (now: number) => void): number {
    this.pending = callback;
    return this.nextHandle++;
  }

  cancelFrame(): void {
    this.cancelCount += 1;
    this.pending = null;
  }

  // 시간을 min(1)만큼 흘려보내고, 그 시점에 걸려 있던 프레임 콜백을 한 번 실행한다.
  advance(ms: number): void {
    this.nowMs += ms;
    const callback = this.pending;
    this.pending = null;
    callback?.(this.nowMs);
  }

  get hasPendingFrame(): boolean {
    return this.pending != null;
  }
}

const setup = () => {
  const scheduler = new FakeScheduler();
  const applied = new Map<string, LatLng>();
  const controller = new MarkerAnimationController({
    applyPosition: (id, position) => applied.set(id, position),
    getCurrentPosition: (id) => applied.get(id),
    scheduler,
  });
  return { scheduler, applied, controller };
};

describe("MarkerAnimationController — 진행률 상한", () => {
  it("보간 도중 몇 프레임을 진행해도 목표 좌표를 넘어가지 않는다", () => {
    const { scheduler, applied, controller } = setup();
    const from: LatLng = { lat: 0, lng: 0 };
    const to: LatLng = { lat: 1, lng: 1 };
    applied.set("bus-1", from);

    controller.receive("bus-1", to); // 첫 수신 이후라 기본 지속시간(2000ms) 사용

    // 지속시간을 훨씬 넘겨 여러 프레임을 흘려보낸다 — 진행률 계산이 1을 넘겨도
    // 실제 반영된 좌표는 목표를 지나치면 안 된다.
    scheduler.advance(10000);
    expect(applied.get("bus-1")).toEqual(to);

    // 더 흘려보내도(다음 프레임이 없어 루프가 이미 멈췄어야 한다) 값이 그대로다.
    expect(scheduler.hasPendingFrame).toBe(false);
  });
});

describe("MarkerAnimationController — 새 좌표 도착 시 이어붙이기", () => {
  it("보간 도중 새 좌표가 오면 지금 표시된 지점에서 이어서 움직인다(튀지 않는다)", () => {
    const { scheduler, applied, controller } = setup();
    applied.set("bus-1", { lat: 0, lng: 0 });

    controller.receive("bus-1", { lat: 10, lng: 10 });
    scheduler.advance(1000); // 지속시간(2000ms)의 절반 지점 — 대략 (5, 5) 부근

    const midway = applied.get("bus-1")!;
    expect(midway.lat).toBeGreaterThan(0);
    expect(midway.lat).toBeLessThan(10);

    // 목표에 도달하기 전에 새 좌표가 도착 — "from" 은 목표(10,10)가 아니라
    // 지금 보이는 midway 지점이어야 한다.
    controller.receive("bus-1", { lat: 20, lng: 20 });
    scheduler.advance(1); // 다음 프레임 한 번만 진행 — 값이 midway 에서 출발해야 한다
    const justAfterRetarget = applied.get("bus-1")!;
    expect(justAfterRetarget.lat).toBeCloseTo(midway.lat, 1);
    expect(justAfterRetarget.lat).not.toBeCloseTo(10, 1); // 옛 목표로 튀지 않았다
  });
});

describe("MarkerAnimationController — 상한 초과 시 즉시 이동", () => {
  it("직전 수신과의 간격이 상한을 넘으면 보간 없이 바로 목표 좌표를 적용한다", () => {
    const { scheduler, applied, controller } = setup();
    applied.set("bus-1", { lat: 0, lng: 0 });

    controller.receive("bus-1", { lat: 1, lng: 1 }); // lastReceivedAt 기록
    scheduler.advance(MAX_INTERPOLATION_DURATION_MS + 1); // 진행 완료 + 상한 초과 간격 확보

    controller.receive("bus-1", { lat: 99, lng: 99 });
    // 즉시 적용이라 프레임을 진행하지 않아도 값이 바로 바뀐다.
    expect(applied.get("bus-1")).toEqual({ lat: 99, lng: 99 });
  });
});

describe("MarkerAnimationController — 화면이 사라질 때 타이머 정지", () => {
  it("dispose 를 부르면 대기 중인 프레임을 취소하고 더 이상 진행하지 않는다", () => {
    const { scheduler, applied, controller } = setup();
    applied.set("bus-1", { lat: 0, lng: 0 });
    controller.receive("bus-1", { lat: 10, lng: 10 });

    expect(scheduler.hasPendingFrame).toBe(true);
    controller.dispose();

    expect(scheduler.cancelCount).toBe(1);
    expect(controller.isRunning).toBe(false);
    expect(scheduler.hasPendingFrame).toBe(false);
  });

  it("이미 멈춘 상태에서 dispose 를 또 불러도 두 번 취소하지 않는다", () => {
    const { scheduler, applied, controller } = setup();
    applied.set("bus-1", { lat: 0, lng: 0 });
    controller.receive("bus-1", { lat: 10, lng: 10 });
    controller.dispose();
    controller.dispose();

    expect(scheduler.cancelCount).toBe(1);
  });
});

describe("MarkerAnimationController — forget", () => {
  it("목록에서 사라진 마커는 다음 보간 대상에서 빠진다", () => {
    const { scheduler, applied, controller } = setup();
    applied.set("bus-1", { lat: 0, lng: 0 });
    controller.receive("bus-1", { lat: 10, lng: 10 });
    controller.forget("bus-1");

    scheduler.advance(2000);
    // forget 이후에는 이 마커에 더는 좌표를 적용하지 않는다 — 마지막으로 적용된
    // 값(생성 직후의 (0,0))에서 더 움직이지 않아야 한다.
    expect(applied.get("bus-1")).toEqual({ lat: 0, lng: 0 });
  });
});
