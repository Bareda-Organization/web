// API_SPEC §1.1 베이스 경로는 `/api/v1`. 서버 호스트만 환경변수로 바꾼다.
const API_HOST = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const API_PATH_PREFIX = "/api/v1";
export const API_BASE_URL = `${API_HOST}${API_PATH_PREFIX}`;

// ngrok 무료 도메인은 브라우저의 GET 을 경고 페이지로 바꿔 돌려준다(CORS 헤더가 없어 응답 차단) — 이 헤더가 있으면 건너뛴다.
// Vercel 웹 + ngrok API 구성(STAGING.md §4.1 · Ruling 841)에서만 붙는다.
export const TUNNEL_HEADERS: Record<string, string> = /\.ngrok-free\.(app|dev)\b/.test(API_HOST)
  ? { "ngrok-skip-browser-warning": "1" }
  : {};
