// features/academy 가 다루는 타입 전부 — 학원 설정(§5.21, A-17).
// §5.21 은 명시적으로 "다른 정책 상수는 범위 밖" 이라 적어, 필드가 하나뿐이다.
export type AcademySettingsResponseTypes = {
  // 무응답 대기 시간(분) — 정수, 1~30, 기본 3. 범위를 벗어나면 422 VALIDATION_FAILED
  // (Ruling 257).
  noShowWaitMinutes: number;
  academy: AcademyInfoTypes | null;
  policy: AcademyPolicyTypes | null;
};

export type UpdateAcademySettingsRequestTypes = {
  noShowWaitMinutes: number;
};

// §5.21 GET 응답에만 실리는 읽기 전용 값(Ruling 820). 서버가 아직 안 주면 null — 화면은 숫자를 박지 않고 값이 있을 때만 그린다.
export type AcademyInfoTypes = { name: string; code: string | null; region: string | null; status: string | null };

export type AcademyPolicyTypes = {
  confirmLeadMinutes: number;
  startWindowMinutes: number;
  changeQuotaPerRun: number;
  delayUnitMinutes: number;
  proximityAlertMeters: number;
  notificationRetentionDays: number;
};
