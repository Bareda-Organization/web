import type { EmergencyType } from "../types";

// §5.16 이 정의한 실제 type 값(소문자 스네이크케이스). 서버 직렬화 정정(BE-R1 목표 3)
// 이후로는 항상 이 형태로 내려오므로 소문자 정규화 없이 그대로 조회한다.
const TYPE_LABEL: Record<string, string> = {
  accident: "사고",
  vehicle_fault: "차량 고장",
  student_emergency: "학생 응급",
  etc: "기타",
};

// 비상 유형의 화면 표기 — 이력 화면과 관제 배너가 같은 문구를 쓴다. 모르는 값은 원문을 그대로 낸다.
export const emergencyTypeLabel = (type: EmergencyType | string): string => TYPE_LABEL[type] ?? type;

// 학원 관계자가 아직 확인하지 않은 비상의 경과 표기 — 1분이 안 됐으면 `1분 미만`, 그 뒤로는 `14분째`('1분 미만째' 는 문장이 안 된다).
export const unackedElapsedText = (seconds: number): string => (seconds < 60 ? "1분 미만" : `${Math.floor(seconds / 60)}분째`);
