// API_SPEC §1.7 멱등성 — 키는 헤더가 아니라 요청 본문 필드 `client_key`(단말 생성 UUID)다.
// 대상은 두 엔드포인트뿐이다: 승하차 처리(PATCH .../riders/{riderId}) · 비상 발신(POST .../emergency).
// 그 외 엔드포인트에 붙이지 않는다 — 서버가 모르는 필드를 보내는 것이라 의미가 없다.
export const createIdempotencyKey = (): string => crypto.randomUUID();
