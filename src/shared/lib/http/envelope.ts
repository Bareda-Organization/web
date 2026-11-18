import { MalformedResponseError } from "./apiError";

// API_SPEC §1.1.1 성공 응답 봉투. 실패 응답은 이 형태를 쓰지 않는다
// (§1.10 — `{"error":{...}}` 그대로, apiError.ts 가 그쪽을 다룬다).
export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  message: string | null;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// 성공 응답 본문을 읽어 봉투의 `data` 를 꺼낸다 — JSON 이 아니거나 `data` 가 없는 본문은 `MalformedResponseError`.
export const readEnvelopeData = async (response: Response): Promise<unknown> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new MalformedResponseError(cause);
  }
  if (!isRecord(body) || !("data" in body)) {
    throw new MalformedResponseError();
  }
  return body.data;
};
