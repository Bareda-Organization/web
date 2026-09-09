import { API_BASE_URL } from "./config";
import { parseApiError } from "./apiError";
import { setAccessToken } from "./accessTokenStore";
import type { SuccessEnvelope } from "./envelope";

type RefreshResponseTypes = {
  accessToken: string;
};

// 동시에 여러 요청이 401 을 맞아도 재발급 호출은 한 번만 나가야 한다 —
// 안 그러면 refresh 토큰이 동시에 회전(rotate)하려다 경합한다.
let pendingRefresh: Promise<string> | null = null;

const requestRefresh = async (): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    // refresh 토큰은 웹에서 쿠키로만 전송된다 (§1.2.1) — 본문은 비운다.
    headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  // §1.1.1 — 이 응답도 봉투에 싸여 온다. `data.access_token` 을 벗겨야 한다.
  const envelope = (await response.json()) as SuccessEnvelope<{ access_token: string }>;
  const responseTypes: RefreshResponseTypes = { accessToken: envelope.data.access_token };
  setAccessToken(responseTypes.accessToken);
  return responseTypes.accessToken;
};

// 재발급을 1회만 시도하게 하는 창구. 이미 진행 중인 재발급이 있으면 그 결과에 합류한다.
export const refreshAccessToken = (): Promise<string> => {
  if (!pendingRefresh) {
    pendingRefresh = requestRefresh().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
};
