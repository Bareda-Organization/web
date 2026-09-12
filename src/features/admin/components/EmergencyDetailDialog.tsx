"use client";

import { Badge, Button, Dialog } from "@/shared/ui";
import type { EmergencyItemResponseTypes } from "../types";
import { StyledEmergencyDetailBody, StyledEmergencyDetailRow } from "./EmergencyAlertsPage.styled";

type EmergencyDetailDialogProps = {
  emergency: EmergencyItemResponseTypes;
  onClose: () => void;
};

// §6.11 상세 — 목록에 다 못 담는 위치·연락처·메모를 보여준다. 비상 상황이라는 맥락상
// §6.13 감사 이력과 달리 연락처를 마스킹하지 않는다(판단 근거, 보고서 §1) — 대응이
// 급한 화면에서 정보를 가리면 오히려 위험하다.
export const EmergencyDetailDialog = ({ emergency, onClose }: EmergencyDetailDialogProps) => (
  <Dialog title={`${emergency.busNo} 비상 알림 상세`} onClose={onClose} footer={<Button onClick={onClose}>닫기</Button>}>
    <StyledEmergencyDetailBody>
      <Badge tone="neutral">{emergency.academy.name}</Badge>
      <StyledEmergencyDetailRow>
        <span>발신자</span>
        <span>
          {emergency.raisedBy.name ?? "미상"} ({emergency.raisedBy.role}) · {emergency.raisedBy.phone ?? "번호 없음"}
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
        <span>
          {emergency.position ? `${emergency.position.lat}, ${emergency.position.lng}` : "위치 확인 불가"}
        </span>
      </StyledEmergencyDetailRow>
      {emergency.contacts.map((contact, index) => (
        <StyledEmergencyDetailRow key={`${contact.role}-${index}`}>
          <span>{contact.role}</span>
          <span>
            {contact.name ?? "미상"} · {contact.phone ?? "번호 없음"}
          </span>
        </StyledEmergencyDetailRow>
      ))}
      <StyledEmergencyDetailRow>
        <span>학원 확인</span>
        <span>{emergency.staffAcked ? `확인됨 (${emergency.ackedBy ?? "-"})` : "미확인"}</span>
      </StyledEmergencyDetailRow>
      <StyledEmergencyDetailRow>
        <span>학원 연락처</span>
        <span>{emergency.academy.contact}</span>
      </StyledEmergencyDetailRow>
    </StyledEmergencyDetailBody>
  </Dialog>
);
