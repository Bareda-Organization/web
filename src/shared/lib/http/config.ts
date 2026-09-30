// API_SPEC §1.1 베이스 경로는 `/api/v1`. 서버 호스트만 환경변수로 바꾼다.
const API_HOST = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const API_PATH_PREFIX = "/api/v1";
export const API_BASE_URL = `${API_HOST}${API_PATH_PREFIX}`;
