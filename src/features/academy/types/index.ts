// features/academy 가 다루는 타입 전부 — 학원 설정(§5.21, A-17).
// §5.21 은 명시적으로 "다른 정책 상수는 범위 밖" 이라 적어, 필드가 하나뿐이다.
export type AcademySettingsResponseTypes = {
  // 무응답 대기 시간(분) — 정수, 1~30, 기본 3. 범위를 벗어나면 422 VALIDATION_FAILED
  // (Ruling 257).
  noShowWaitMinutes: number;
};

export type UpdateAcademySettingsRequestTypes = {
  noShowWaitMinutes: number;
};
