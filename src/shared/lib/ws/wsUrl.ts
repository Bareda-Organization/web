// STOMP 엔드포인트 베이스 URL. `shared/lib/http/config.ts` 의 `API_BASE_URL` 과
// 같은 `NEXT_PUBLIC_API_BASE_URL` 환경변수를 재사용하되, 두 가지가 다르다.
//
// 1. 스킴 변환 — WebSocket 은 `ws`/`wss`, REST 는 `http`/`https`. `http://` →
//    `ws://`, `https://` → `wss://` 로 바꾼다.
// 2. 경로 접두사 — REST 는 `/api/v1` 이 붙지만 WS 엔드포인트는 붙지 않는다.
//    `backend/src/main/resources/application.yml` 에 `server.servlet.context-path`
//    가 설정돼 있지 않아(직접 확인, 2026-09-13) `/ws/location` 이 애플리케이션
//    루트에 그대로 등록된다 — `API_BASE_URL` 을 이어붙이면 존재하지 않는
//    `/api/v1/ws/location` 을 가리키게 된다.
const API_HOST = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const toWsScheme = (host: string): string => {
  if (host.startsWith("https://")) {
    return `wss://${host.slice("https://".length)}`;
  }
  if (host.startsWith("http://")) {
    return `ws://${host.slice("http://".length)}`;
  }
  // 스킴이 없는 값(예: 순수 호스트명)이 들어오면 평문 ws 로 가정한다 — 배포
  // 환경은 항상 스킴이 붙은 절대 URL 을 주므로 이 분기는 로컬 오설정 방어용이다.
  return `ws://${host}`;
};

export const WS_BASE_URL = `${toWsScheme(API_HOST)}/ws/location`;
