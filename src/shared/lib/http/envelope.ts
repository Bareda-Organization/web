// API_SPEC §1.1.1 성공 응답 봉투. 실패 응답은 이 형태를 쓰지 않는다
// (§1.10 — `{"error":{...}}` 그대로, apiError.ts 가 그쪽을 다룬다).
export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  message: string | null;
};
