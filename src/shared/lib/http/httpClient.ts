import { API_BASE_URL } from "./config";
import { NetworkError, parseApiError } from "./apiError";
import { getAccessToken } from "./accessTokenStore";
import { refreshAccessToken } from "./refreshClient";
import { notifyAuthGate } from "./authGate";
import type { SuccessEnvelope } from "./envelope";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiFetchOptions = {
  method?: HttpMethod;
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
  // §1.7 멱등성 대상 두 엔드포인트에서만 넘긴다 — 본문에 `client_key` 로 실린다.
  idempotencyKey?: string;
  signal?: AbortSignal;
};

const buildUrl = (path: string, query?: ApiFetchOptions["query"]): string => {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
};

const buildHeaders = (hasBody: boolean): HeadersInit => {
  const headers: Record<string, string> = {
    // §1.2.1 — 이 값이 로그인 응답에서 refresh 를 본문으로 줄지 쿠키로 줄지 가른다.
    "X-Client-Type": "web",
  };
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const rawFetch = async (path: string, options: ApiFetchOptions): Promise<Response> => {
  const body =
    options.idempotencyKey !== undefined
      ? { ...(options.body ?? {}), client_key: options.idempotencyKey }
      : options.body;

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: buildHeaders(body !== undefined),
      // §1.2.1 — refresh 쿠키가 응답에 오고 다음 요청에 자동 동봉되려면 항상 필요하다.
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });
  } catch (cause) {
    // fetch 가 reject 하는 것은 응답을 아예 못 받은 경우(오프라인·DNS·CORS 차단 등)뿐이다.
    throw new NetworkError(cause);
  }
};

// pending·rejected 계정이 허용 밖을 불러 받는 코드 (§1.4). 이 두 코드를 만나면
// 화면이 아니라 이 계층에서 대기 화면 이동을 트리거한다 — BRIEF-web §3 "판정은
// 한 곳에서, 화면은 결과만 받는다"를 만족하려면 http 계층이 이걸 알아야 한다.
const isAccountGateCode = (code: string): boolean => code === "AUTH_PENDING" || code === "AUTH_REJECTED";

// API_SPEC §1 공통 규약(토큰 부착 · 401 재발급 · 클라이언트 타입 · 에러 변환 ·
// 성공 응답 봉투 벗기기)을 한곳에서 처리하는 창구. 컴포넌트·기능 코드는 이 함수만
// 거쳐 서버를 호출한다 — `frontend/CONVENTIONS.md` "API 호출은 기능 안에서만".
export const apiFetch = async <T = void>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
  let response = await rawFetch(path, options);

  if (!response.ok && response.status === 401) {
    const failure = await parseApiError(response);
    // TOKEN_EXPIRED 만 재발급 대상이다 — UNAUTHORIZED(토큰 자체가 없음)는
    // 재발급이 아니라 로그인부터 다시 해야 하는 자리라 여기서 갈린다 (§8.1).
    if (failure.code === "TOKEN_EXPIRED") {
      try {
        await refreshAccessToken();
      } catch (refreshFailure) {
        // refresh 토큰까지 무효화된 것 — 재로그인이 필요하다는 것을 화면에 알린다.
        notifyAuthGate({ type: "session-expired" });
        throw refreshFailure;
      }
      response = await rawFetch(path, options);
    } else {
      throw failure;
    }
  }

  if (!response.ok) {
    const failure = await parseApiError(response);
    if (response.status === 403 && isAccountGateCode(failure.code)) {
      notifyAuthGate({ type: "auth-pending" });
    }
    throw failure;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // §1.1.1 — 성공 응답은 항상 `{success,data,message}` 로 온다. API_SPEC 각 절이
  // 서술하는 필드는 전부 `data` 안에 있다. 이 봉투를 벗기는 자리는 여기 한 곳뿐이다.
  const envelope = (await response.json()) as SuccessEnvelope<T>;
  return envelope.data;
};
