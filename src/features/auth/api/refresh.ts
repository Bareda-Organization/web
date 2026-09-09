import { refreshAccessToken } from "@/shared/lib/http";

// POST /auth/refresh (§2.6, C-14) — 실제 구현은 `shared/lib/http/refreshClient.ts` 에
// 있다. 401 TOKEN_EXPIRED 를 만난 모든 요청이 그 모듈을 거쳐 자동 재시도하므로 로직을
// 두 벌 두지 않는다 — 이 파일은 AuthSessionProvider 의 "새로고침 직후 부트스트랩"
// 호출 지점을 `features/auth` 배럴에서 드러내기 위한 얇은 재노출이다.
export const refresh = refreshAccessToken;
