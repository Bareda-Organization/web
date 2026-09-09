import type { ApiErrorCode } from "./apiErrorCodes";

// API_SPEC §1.10 에러 응답 봉투 그대로. 컴포넌트는 이 형태를 직접 보지 않고
// 아래 ApiError 로 변환된 것만 받는다.
type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

// http 응답이 실패했을 때 던지는 타입. 컴포넌트는 raw Response 를 보지 않고
// 이 타입 하나만 다룬다 — `frontend/CONVENTIONS.md` "API 호출은 기능 안에서만".
export class ApiError extends Error {
  readonly status: number;
  // §8 사전에 없는 코드가 올 수도 있어(신규 코드 추가 지연 · 프록시 오류 등)
  // 유니온이 아니라 string 으로 받고, 판정 분기에서만 ApiErrorCode 로 좁혀 쓴다.
  readonly code: ApiErrorCode | (string & {});
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// 네트워크 자체가 끊긴 경우(서버 응답을 아예 못 받음) — §1.9 의
// "타임아웃·5xx 는 처리되지 않았습니다" 판정에서 5xx 와 같은 갈래로 다룬다.
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("네트워크 요청이 실패했습니다");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export const parseApiError = async (response: Response): Promise<ApiError> => {
  try {
    const body = (await response.json()) as ApiErrorEnvelope;
    return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
  } catch {
    // 에러 봉투(§1.10) 형식이 아닌 응답 — 프록시·인프라 계층에서 온 5xx 등.
    return new ApiError(response.status, "UNKNOWN", response.statusText || "알 수 없는 오류");
  }
};
