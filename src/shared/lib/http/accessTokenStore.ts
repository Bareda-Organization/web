// access 토큰은 §1.2.1 에 따라 웹도 응답 본문으로 받는다(쿠키로 도는 것은 refresh 뿐).
// 그래서 저장 위치가 필요한데, 로그인 흐름(F2)이 아직 없어 지금은 메모리 한 칸이 전부다.
// 탭을 새로고침하면 사라지고, 그 복구는 `POST /auth/refresh` 를 앱 시작 시 한 번
// 호출하는 F2 쪽 책임이다 — 여기서는 "현재 access 토큰을 어디서 읽고 쓰는가" 만 고정한다.
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
