// features/emergency 가 다루는 타입 전부 — 비상 알림 수신·확인(§5.16, EXC-04, A-16).

// ⚠ §5.16 표는 소문자(`accident` 등)로 적었지만, 실측(curl, staffA 로그인,
// GET /staff/emergencies)은 매번 대문자 스네이크(`VEHICLE_FAULT`)였다(§2 확신
// 없는 지점 · 사양-실제 불일치). 화면은 실측을 따른다.
export type EmergencyType = "ACCIDENT" | "VEHICLE_FAULT" | "STUDENT_EMERGENCY" | "ETC";

export type EmergencyStatus = "open" | "acked" | "canceled";

export type EmergencyPersonTypes = {
  name: string | null;
  role: "driver" | "escort";
  phone: string | null;
};

export type EmergencyPositionTypes = {
  lat: number;
  lng: number;
  recordedAt: string | null;
};

// emergency_id — §5.16 표는 string 이라 적었지만 실측은 숫자였다(notification_id 와
// 같은 성격의 사양-실제 불일치, §2).
export type EmergencyItemResponseTypes = {
  emergencyId: number;
  type: EmergencyType;
  memo: string | null;
  raisedBy: EmergencyPersonTypes;
  runId: number;
  busNo: string;
  direction: "to_academy" | "from_academy";
  position: EmergencyPositionTypes;
  riderCount: number;
  contacts: EmergencyPersonTypes[];
  raisedAt: string;
  ackedAt: string | null;
  canceledAt: string | null;
  // 표에는 없으나 실측 응답에 존재 — acked_at 유무만으로도 판정 가능하지만
  // 서버가 이미 계산해 주는 값이라 그대로 쓴다.
  acked: boolean;
  ackedBy: { name: string } | null;
};

// ⚠ §5.16 은 봉투를 `items[]` 라 적었지만 실측 응답 키는 `emergencies` 였다
// (§2 확신 없는 지점). 화면·barrel 이름은 다른 목록과 통일하기 위해 매핑 단계에서
// `items` 로 옮긴다.
export type EmergencyListResponseTypes = {
  items: EmergencyItemResponseTypes[];
  unackedCount: number;
};

export type EmergencyListQueryTypes = {
  status?: EmergencyStatus;
  date?: string;
};

export type AckEmergencyResponseTypes = {
  emergencyId: number;
  ackedAt: string;
};
