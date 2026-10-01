import { API_BASE_URL } from "./config";
import { ApiError, NetworkError, parseApiError } from "./apiError";
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
  // 대상은 승하차 처리(PATCH .../riders/{riderId}) · 비상 발신(POST .../emergency) 둘뿐이고
  // 그 밖에는 붙이지 않는다 — 서버가 모르는 필드를 보내는 것이라 의미가 없다.
  // 값은 `crypto.randomUUID()` 를 부르는 쪽에서 만든다.
  idempotencyKey?: string;
  signal?: AbortSignal;
};

// §5.11 학생 사진 업로드 전용 — 문서 40행 "이 엔드포인트만 multipart/form-data"
// (JSON 파트 + 파일 파트). 백엔드가 JSON 을 감싸는 파트 이름을 "data" 로 고정해
// 요구한다(`StaffStudentController` `@RequestPart("data")`) — `data` 는 JSON
// 문자열 파트로, `file` 은 별도 파일 파트로 보낸다(`data` 는 이미 snake_case 로
// 변환된 값 — 백엔드가 전역 SNAKE_CASE 네이밍 전략을 쓴다).
type ApiFetchMultipartOptions = {
  method?: Extract<HttpMethod, "POST" | "PATCH">;
  // JSON 파트(`data`)로 직렬화되므로 목록·객체도 담을 수 있다(학생 수정의 보호자 연락처 목록).
  data?: Record<string, unknown>;
  file?: { field: string; value: File };
  query?: Record<string, string | number | boolean | undefined>;
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

// 조회(GET)가 응답 헤더를 기다리는 한도 — 서버가 연결은 받고 응답을 안 주는 상태(DB 풀 고갈 뒤 대기 · 반쯤 죽은 TCP)에서 브라우저가
// 포기할 때까지(수 분) 폴링이 매달려 그 화면 갱신이 멈추는 것을 막는다. 넘으면 `NetworkError` 로 끊어 폴링의 실패 백오프가 이어받는다
// (R46-FIXCONN C-8). 쓰기(POST·PATCH·PUT·DELETE)는 서버가 이미 처리를 시작했을 수 있어 끊지 않는다.
// ponytail: 본문을 다 읽기까지의 한도는 아님(헤더 도착까지) — 본문이 멈추는 경우가 실측되면 읽기 단계에도 같은 타이머를 건다.
const GET_TIMEOUT_MS = 15000;

const rawFetch = async (path: string, options: ApiFetchOptions): Promise<Response> => {
  const body =
    options.idempotencyKey !== undefined
      ? { ...(options.body ?? {}), client_key: options.idempotencyKey }
      : options.body;
  const method = options.method ?? "GET";

  // 호출부의 중단 신호와 시간 제한을 하나로 묶는다 — 둘 중 어느 쪽이든 먼저 오면 요청을 끊는다.
  const timeoutController = method === "GET" ? new AbortController() : undefined;
  const timer = timeoutController ? setTimeout(() => timeoutController.abort(), GET_TIMEOUT_MS) : undefined;
  const forwardAbort = () => timeoutController?.abort();
  if (timeoutController) {
    if (options.signal?.aborted) timeoutController.abort();
    options.signal?.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers: buildHeaders(body !== undefined),
      // §1.2.1 — refresh 쿠키가 응답에 오고 다음 요청에 자동 동봉되려면 항상 필요하다.
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: timeoutController?.signal ?? options.signal,
    });
  } catch (cause) {
    // fetch 가 reject 하는 것은 응답을 아예 못 받은 경우(오프라인·DNS·CORS 차단·시간 제한 등)뿐이다.
    throw new NetworkError(cause);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
};

// pending·rejected 계정이 허용 밖을 불러 받는 코드 (§1.4). 이 두 코드를 만나면
// 화면이 아니라 이 계층에서 대기 화면 이동을 트리거한다 — BRIEF-web §3 "판정은
// 한 곳에서, 화면은 결과만 받는다"를 만족하려면 http 계층이 이걸 알아야 한다.
// PASSWORD_CHANGE_REQUIRED(임시 비밀번호 강제 변경, Ruling 540)도 같은 길이다 — 세션을 다시 확인하면 `/me` 의
// must_change_password 가 참으로 내려와 가드가 변경 화면을 띄운다.
const isAccountGateCode = (code: string): boolean =>
  code === "AUTH_PENDING" || code === "AUTH_REJECTED" || code === "PASSWORD_CHANGE_REQUIRED";

// 401 재발급·계정 게이트 통지·에러 변환·봉투 벗기기 — apiFetch·apiFetchMultipart
// 둘 다 이 응답 처리 규약을 똑같이 따라야 하므로 여기 한 곳으로 모은다. 요청을
// 다시 보내는 방법(JSON 재전송 vs multipart 재전송)만 `retry` 로 갈라 받는다.
const readEnvelope = async <T>(response: Response): Promise<T> => {
  // §1.1.1 — 성공 응답은 항상 `{success,data,message}` 로 온다. API_SPEC 각 절이
  // 서술하는 필드는 전부 `data` 안에 있다. 이 봉투를 벗기는 자리는 여기 한 곳뿐이다.
  const envelope = (await response.json()) as SuccessEnvelope<T>;
  return envelope.data;
};

const handleResponse = async <T>(
  response: Response,
  retry: () => Promise<Response>,
  read: (response: Response) => Promise<T> = readEnvelope,
): Promise<T> => {
  if (!response.ok && response.status === 401) {
    const failure = await parseApiError(response);
    // TOKEN_EXPIRED 만 재발급 대상이다 — UNAUTHORIZED(토큰 자체가 없음)는
    // 재발급이 아니라 로그인부터 다시 해야 하는 자리라 여기서 갈린다 (§8.1).
    if (failure.code === "TOKEN_EXPIRED") {
      try {
        await refreshAccessToken();
      } catch (refreshFailure) {
        // 재발급이 401 로 거절돼야 refresh 토큰까지 무효화된 것이다 — 재로그인이
        // 필요하다는 것을 화면에 알린다. 네트워크 오류·5xx 는 일시적일 수 있어
        // 세션을 지키고 원래 오류만 던진다(화면이 "다시 시도" 를 보인다).
        if (refreshFailure instanceof ApiError && refreshFailure.status === 401) {
          notifyAuthGate({ type: "session-expired" });
        }
        throw refreshFailure;
      }
      response = await retry();
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

  return read(response);
};

// API_SPEC §1 공통 규약(토큰 부착 · 401 재발급 · 클라이언트 타입 · 에러 변환 ·
// 성공 응답 봉투 벗기기)을 한곳에서 처리하는 창구. 컴포넌트·기능 코드는 이 함수만
// 거쳐 서버를 호출한다 — `docs/frontend/CONVENTIONS_REACT.md` "API 호출은 기능 안에서만".
export const apiFetch = async <T = void>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
  const response = await rawFetch(path, options);
  return handleResponse<T>(response, () => rawFetch(path, options));
};

const buildMultipartHeaders = (): HeadersInit => {
  // Content-Type 은 일부러 넣지 않는다 — FormData 를 body 로 주면 브라우저가
  // boundary 를 붙인 `multipart/form-data; boundary=...` 를 스스로 채운다.
  // 여기서 고정값을 넣으면 그 boundary 가 없어져 서버가 파싱하지 못한다.
  const headers: Record<string, string> = { "X-Client-Type": "web" };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const buildFormData = (options: ApiFetchMultipartOptions): FormData => {
  const form = new FormData();
  if (options.data) {
    form.set("data", new Blob([JSON.stringify(options.data)], { type: "application/json" }));
  }
  if (options.file) {
    form.set(options.file.field, options.file.value);
  }
  return form;
};

const rawFetchMultipart = async (path: string, options: ApiFetchMultipartOptions): Promise<Response> => {
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "POST",
      headers: buildMultipartHeaders(),
      credentials: "include",
      body: buildFormData(options),
      signal: options.signal,
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }
};

// §5.11 학생 사진 업로드 전용 창구 — apiFetch 와 같은 응답 처리 규약(401 재발급·
// 에러 변환·봉투 벗기기)을 공유하되, 요청 본문만 FormData 로 다르게 보낸다.
// 사진이 없는 등록·수정은 그냥 apiFetch(JSON) 를 쓴다 — 이 함수는 파일이 실제로
// 실릴 때만 쓴다.
export const apiFetchMultipart = async <T = void>(
  path: string,
  options: ApiFetchMultipartOptions = {},
): Promise<T> => {
  const response = await rawFetchMultipart(path, options);
  return handleResponse<T>(response, () => rawFetchMultipart(path, options));
};

// §5.11.1 학생 사진처럼 봉투가 아니라 이미지 바이트가 오는 GET 전용 창구 — 토큰 부착·401 재발급·
// 에러 변환은 apiFetch 와 같은 규약을 타고, 성공 본문만 Blob 으로 읽는다.
export const apiFetchBlob = async (path: string, options: Pick<ApiFetchOptions, "signal"> = {}): Promise<Blob> => {
  const response = await rawFetch(path, options);
  return handleResponse<Blob>(response, () => rawFetch(path, options), (ok) => ok.blob());
};
