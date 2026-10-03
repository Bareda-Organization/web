// API_SPEC §6.5 학원당 재직(active) 관계자 1명 — 이미 찬 학원의 추가 승인은 서버가 409 STAFF_QUOTA_EXCEEDED 로 거부한다.
const ACADEMY_STAFF_QUOTA = 1;

export const isStaffQuotaFull = (academyStaffCount: number): boolean => academyStaffCount >= ACADEMY_STAFF_QUOTA;
