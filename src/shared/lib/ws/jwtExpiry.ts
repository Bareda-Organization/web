// JWT 페이로드의 `exp`(초)를 밀리초로 읽는다. 로그인·재발급 응답에 만료 시각 필드가 없어(`API_SPEC §2`) 토큰 자체에서 읽는다.
// 서명은 검증하지 않는다 — 만료 시각을 알 뿐 신뢰 판단에 쓰지 않으며, 틀린 값이어도 결과는 갈아타기가 일찍·늦게 시작하는 데 그친다
// (늦으면 기존 `TOKEN_EXPIRED` 재연결 경로). 읽을 수 없으면 null.
export const readJwtExpiryMs = (token: string): number | null => {
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
};
