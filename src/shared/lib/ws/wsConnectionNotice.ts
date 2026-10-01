import type { WsConnectionState } from "./wsConnectionState";

export type WsConnectionNotice = { title: string; body: string };

// 같은 끊김을 화면마다 다른 문구로 알리던 것을 한 벌로 모은다(R46-FIXCONN C-12). 학부모·매니저 앱도 같은 제목을 쓴다
// (`baraeda_core` `WsConnectionNotice`) — 지원 문의 때 "무슨 문구가 떴나" 로 상태를 가를 수 있게. 문구를 바꾸면 양쪽을 같이 고친다.
const RECONNECTING: WsConnectionNotice = {
  title: "재연결 시도 중입니다",
  body: "연결될 때까지 자동으로 계속 시도합니다. 그동안 새 소식이 늦게 보일 수 있습니다.",
};
const GAVE_UP: WsConnectionNotice = {
  title: "실시간 연결 끊김",
  body: "실시간 갱신 연결이 끊어졌습니다. 새 소식이 늦게 보일 수 있습니다.",
};
const FORBIDDEN: WsConnectionNotice = {
  title: "실시간 조회 권한 없음",
  body: "이 화면의 실시간 갱신을 볼 권한이 없습니다. 새 소식이 늦게 보일 수 있습니다.",
};

// 사용자에게 알릴 연결 상태의 안내 문구 — 정상·연결 시도 중·직접 끊음은 알릴 것이 없어 `null`.
export const getWsConnectionNotice = (state: WsConnectionState): WsConnectionNotice | null => {
  switch (state) {
    case "reconnecting":
      return RECONNECTING;
    case "gaveUp":
      return GAVE_UP;
    case "forbidden":
      return FORBIDDEN;
    default:
      return null;
  }
};
