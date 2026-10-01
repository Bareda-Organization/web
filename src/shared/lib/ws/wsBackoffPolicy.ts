// 재연결 대기 간격 정책 — 지수 백오프 + 상한 + 지터 + (선택) 포기(give-up) 조건.
// `baraeda_core` 의 `WsBackoffPolicy`(Dart)와 같은 공식을 그대로 쓴다 — 클라이언트
// 종류가 다르다고 "얼마나 기다렸다 붙는가"라는 사용자 경험까지 갈릴 이유가 없다.
// 기본 정책은 **포기하지 않고** 30초 상한 간격으로 계속 시도한다(R46-FIXRT S-5) —
// 6회(약 1분) 뒤 포기하던 옛 기본값은 터널·음영·재기동이 1분을 넘으면 실시간 연결을
// 끊긴 채 방치했다. 망이 죽은 동안의 비용은 30초마다 소켓 시도 1회뿐이다.
//
// `@stomp/stompjs` 의 `Client.reconnectDelay`(+ `reconnectTimeMode`)도 지수 백오프를
// 지원하지만 **지터가 없다**(서버 재배포로 모든 탭이 같은 순간에 끊기면 같은 순간에 몰려
// 붙는다). Dart 쪽이 `stomp_dart_client` 의 내장 재연결을 끄고 직접 타이머를 건 것과
// 같은 이유로, 여기서도 `reconnectDelay: 0` 으로 내장 재연결을 끄고 이 정책이 계산한
// 지연으로 `AcademyRealtimeClient` 가 직접 `setTimeout` 을 건다.
//
// 순수 계산 클래스로 둔 이유 — 타이머를 직접 다루면 단위 시험이 실제 시간만큼
// 기다리거나 가짜 타이머가 필요해진다. 간격 계산만 분리해 두면 "3번째 재시도의
// 대기가 정확히 몇 ms 인가"를 타이머 없이 바로 검사할 수 있다.
export type WsBackoffPolicyOptions = {
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
  // 이 횟수를 넘기면 `shouldGiveUp` 이 참 — 생략하면 포기하지 않는다.
  maxAttempts?: number;
  // `jitteredDelayFor` 가 대기를 최대 이 비율만큼 **줄이는** 폭. 0 이면 지터 없음.
  jitterRatio?: number;
};

export class WsBackoffPolicy {
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly multiplier: number;
  readonly maxAttempts: number | undefined;
  private readonly jitterRatio: number;

  constructor(options: WsBackoffPolicyOptions = {}) {
    this.initialDelayMs = options.initialDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.multiplier = options.multiplier ?? 2;
    this.maxAttempts = options.maxAttempts;
    this.jitterRatio = options.jitterRatio ?? 0.3;
  }

  // `attempt` 는 1부터 시작(첫 재연결 시도). `initialDelayMs * multiplier^(attempt-1)`
  // 을 계산하고 `maxDelayMs` 로 자른다 — 1·2·4·8·16·30(상한), 이후 30초.
  delayFor(attempt: number): number {
    if (attempt < 1) {
      throw new Error("attempt 는 1부터 시작한다 (첫 재연결 시도 = 1)");
    }
    const rawMs = this.initialDelayMs * this.multiplier ** (attempt - 1);
    return Math.round(Math.min(rawMs, this.maxDelayMs));
  }

  // `delayFor` 에서 무작위로 최대 `jitterRatio` 만큼 줄인 대기. 서버 재배포로 모든 탭이 동시에
  // 끊기면 고정 간격은 같은 순간에 재접속이 몰린다(서버는 1대) — 간격을 흩어 그 몰림을 푼다.
  // 줄이는 방향으로만 더해 `maxDelayMs` 를 넘지 않는다.
  jitteredDelayFor(attempt: number, random: () => number = Math.random): number {
    return Math.round(this.delayFor(attempt) * (1 - random() * this.jitterRatio));
  }

  // `attempt` 번째 시도를 하기 전에 이미 포기 조건에 도달했는가 — `maxAttempts` 가 없으면 언제나 거짓.
  shouldGiveUp(attempt: number): boolean {
    return this.maxAttempts !== undefined && attempt > this.maxAttempts;
  }
}
