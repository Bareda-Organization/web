// http 계층은 Next.js 라우터를 모른다(테스트도 하고, 여러 곳에서 재사용해야 해서
// React 트리 바깥에 둔다). 계정 상태 게이트(API_SPEC §1.4)를 위반한 응답을 만나면
// 이 창구로 "무슨 일이 있었는지"만 알리고, 실제 화면 이동은 React 쪽의
// `AuthGateBridge`(features/auth) 가 구독해서 처리한다.
//
// accessTokenStore.ts 와 같은 형태(모듈 전역 한 칸)를 쓴다 — 구독자가 항상 하나
// (앱 루트에 마운트되는 AuthGateBridge)뿐이라 이벤트 버스를 새로 만들 필요가 없다.
export type AuthGateEvent =
  // pending·rejected 계정이 허용 밖 API 를 불러 403 AUTH_PENDING · AUTH_REJECTED 를
  // 받았다 (§1.4). 로그인 중이던 화면이라도 즉시 대기 화면으로 옮겨야 한다.
  | { type: "auth-pending" }
  // access 재발급(§2.6)까지 실패했다 — refresh 토큰도 무효화됐으니 재로그인이 필요하다.
  | { type: "session-expired" };

type AuthGateListener = (event: AuthGateEvent) => void;

let listener: AuthGateListener | null = null;

/** AuthGateBridge 가 마운트될 때 한 번 등록한다. 반환값으로 언마운트 시 해제한다. */
export const registerAuthGateListener = (fn: AuthGateListener): (() => void) => {
  listener = fn;
  return () => {
    if (listener === fn) {
      listener = null;
    }
  };
};

/** httpClient.ts 전용 — 화면 코드에서 직접 부르지 않는다. */
export const notifyAuthGate = (event: AuthGateEvent): void => {
  listener?.(event);
};
