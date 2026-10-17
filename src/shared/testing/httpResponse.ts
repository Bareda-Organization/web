// API 어댑터 시험이 `fetch` 에 돌려줄 가짜 응답 — 시험 전용(앱 코드는 부르지 않는다).
// `mockJsonResponse` 는 상태 코드와 본문을 그대로, `jsonResponse` 는 성공 봉투(`API_SPEC §1.1.1`)로 감싼 200 을 만든다.
export const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

export const jsonResponse = (data: unknown): Response => mockJsonResponse(200, { success: true, data });
