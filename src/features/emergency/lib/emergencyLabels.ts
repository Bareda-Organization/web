import type { EmergencyType } from "../types";

// 비상 알림의 종류·발신 역할을 화면에 보일 한글 이름 — 목록·팝업·상세가 같은 표를 쓴다.
export const EMERGENCY_TYPE_LABEL: Record<EmergencyType, string> = {
  accident: "사고",
  vehicle_fault: "차량 고장",
  student_emergency: "학생 응급상황",
  etc: "기타",
};

export const EMERGENCY_ROLE_LABEL: Record<"driver" | "escort", string> = { driver: "기사", escort: "동승자" };

// 서버가 사전에 없는 값을 보내도 영문 코드를 그대로 화면에 내지 않는다.
export const toEmergencyTypeLabel = (type: string): string => EMERGENCY_TYPE_LABEL[type as EmergencyType] ?? "비상 상황";

// 확인하려는 순간 발신자가 철회한 신고(409 EMERGENCY_CANCELED, Ruling 885 ①)에 보이는 안내 — 목록 · 상세 · 상단 띠가 같은 문장을 쓴다.
export const CANCELED_ACK_MESSAGE = "발신자가 이 비상 신고를 철회했습니다. 확인할 필요가 없습니다";
