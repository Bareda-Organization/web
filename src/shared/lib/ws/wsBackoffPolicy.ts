// 재연결 대기 간격 정책 — 지수 백오프 + 상한 + 포기(give-up) 조건.
// `baraeda_core` 의 `WsBackoffPolicy`(Dart)와 같은 공식을 그대로 쓴다 — 클라이언트
// 종류가 다르다고 "얼마나 기다렸다 포기하는가"라는 사용자 경험까지 갈릴 이유가 없다.
//
// `@stomp/stompjs` 의 `Client.reconnectDelay`(+ `reconnectTimeMode`)도 지수 백오프를
// 지원하지만 **포기 조건이 없다** — 서버가 계속 꺼져 있어도 영원히 재시도한다.
// Dart 쪽이 `stomp_dart_client` 의 내장 재연결을 끄고 직접 타이머를 건 것과 같은
// 이유로, 여기서도 `reconnectDelay: 0` 으로 내장 재연결을 끄고 이 정책이 계산한
// 지연으로 `AcademyRealtimeClient` 가 직접 `setTimeout` 을 건다.
//
// 순수 계산 클래스로 둔 이유 — 타이머를 직접 다루면 단위 시험이 실제 시간만큼
// 기다리거나 가짜 타이머가 필요해진다. 간격 계산만 분리해 두면 "3번째 재시도의
// 대기가 정확히 몇 ms 인가"를 타이머 없이 바로 검사할 수 있다.
export type WsBackoffPolicyOptions = {
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
  maxAttempts?: number;
};

export class WsBackoffPolicy {
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly multiplier: number;
  readonly maxAttempts: number;

  constructor(options: WsBackoffPolicyOptions = {}) {
    this.initialDelayMs = options.initialDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.multiplier = options.multiplier ?? 2;
    this.maxAttempts = options.maxAttempts ?? 6;
  }

  // `attempt` 는 1부터 시작(첫 재연결 시도). `initialDelayMs * multiplier^(attempt-1)`
  // 을 계산하고 `maxDelayMs` 로 자른다. 1·2·4·8·16·30(상한 도달) 초로 6회 시도 후
  // 포기하면 마지막 시도까지 누적 대기가 약 61초다 — 화면 하나를 띄워 둔 채
  // 무한정 기다리게 하지 않으면서도, 순간적인 서버 재기동은 흡수한다.
  delayFor(attempt: number): number {
    if (attempt < 1) {
      throw new Error("attempt 는 1부터 시작한다 (첫 재연결 시도 = 1)");
    }
    const rawMs = this.initialDelayMs * this.multiplier ** (attempt - 1);
    return Math.round(Math.min(rawMs, this.maxDelayMs));
  }

  // `attempt` 번째 시도를 하기 전에 이미 포기 조건에 도달했는가.
  shouldGiveUp(attempt: number): boolean {
    return attempt > this.maxAttempts;
  }
}
