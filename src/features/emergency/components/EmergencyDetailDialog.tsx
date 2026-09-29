"use client";

import { Badge, Button, Dialog } from "@/shared/ui";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { EMERGENCY_ROLE_LABEL, EMERGENCY_TYPE_LABEL } from "../lib/emergencyLabels";
import { emergencyMapUrl } from "../lib/mapLink";
import type { EmergencyItemResponseTypes } from "../types";
import { StyledEmergencyDetailBody, StyledEmergencyDetailRow } from "./EmergencyDetailDialog.styled";

type EmergencyDetailDialogProps = {
  emergency: EmergencyItemResponseTypes;
  onClose: () => void;
};

// 목록에 다 못 담는 발신자·배치 인력 연락처·메모·위치를 보여 준다. 비상 상황이라 연락처를 가리지 않는다 —
// 대응이 급한 화면에서 정보를 가리면 오히려 위험하다(메인 관리자 화면 `EmergencyDetailDialog` 와 같은 판단).
export const EmergencyDetailDialog = ({ emergency, onClose }: EmergencyDetailDialogProps) => (
  <Dialog title={`${emergency.busNo} 비상 알림 상세`} onClose={onClose} footer={<Button onClick={onClose}>닫기</Button>}>
    <StyledEmergencyDetailBody>
      <Badge tone="red">{EMERGENCY_TYPE_LABEL[emergency.type]}</Badge>
      <StyledEmergencyDetailRow>
        <span>발생 시각</span>
        <span>{formatDateTime(emergency.raisedAt)}</span>
      </StyledEmergencyDetailRow>
      <StyledEmergencyDetailRow>
        <span>발신자</span>
        <span>
          {emergency.raisedBy.name ?? "미상"} ({EMERGENCY_ROLE_LABEL[emergency.raisedBy.role]}) ·{" "}
          {emergency.raisedBy.phone ?? "번호 없음"}
        </span>
      </StyledEmergencyDetailRow>
      <StyledEmergencyDetailRow>
        <span>메모</span>
        <span>{emergency.memo ?? "-"}</span>
      </StyledEmergencyDetailRow>
      <StyledEmergencyDetailRow>
        <span>탑승 인원</span>
        <span>{emergency.riderCount}명</span>
      </StyledEmergencyDetailRow>
      <StyledEmergencyDetailRow>
        <span>발신 위치</span>
        <a href={emergencyMapUrl(emergency.position)} target="_blank" rel="noreferrer">
          지도에서 보기
        </a>
      </StyledEmergencyDetailRow>
      {emergency.contacts.map((contact, index) => (
        <StyledEmergencyDetailRow key={`${contact.role}-${index}`}>
          <span>{EMERGENCY_ROLE_LABEL[contact.role]} 연락처</span>
          <span>
            {contact.name ?? "미상"} · {contact.phone ?? "번호 없음"}
          </span>
        </StyledEmergencyDetailRow>
      ))}
    </StyledEmergencyDetailBody>
  </Dialog>
);
