"use client";

import { useState } from "react";
import { Badge, Button, Dialog, Textarea } from "@/shared/ui";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { EMERGENCY_ROLE_LABEL, EMERGENCY_TYPE_LABEL } from "../lib/emergencyLabels";
import { emergencyMapUrl } from "../lib/mapLink";
import { FREE_TEXT_PRIVACY_NOTICE } from "@/shared/lib/freeTextNotice";
import type { EmergencyItemResponseTypes } from "../types";
import { PhoneContact } from "./PhoneContact";
import { StyledEmergencyDetailBody, StyledEmergencyDetailRow } from "./EmergencyDetailDialog.styled";

// 서버 상한과 같다(`EmergencyAckRequest` @Size(max = 200)) — 넘기면 서버가 422 로 거절한다.
const ACK_MEMO_MAX_LENGTH = 200;

type EmergencyDetailDialogProps = {
  emergency: EmergencyItemResponseTypes;
  onClose: () => void;
  // 있으면 미확인 건에 조치 메모 입력칸과 [확인] 이 붙는다(Ruling 541). 메모는 선택이라 비우면 undefined.
  onAck?: (memo: string | undefined) => void;
  acking?: boolean;
};

// 목록에 다 못 담는 발신자·배치 인력 연락처·메모·위치를 보여 준다. 비상 상황이라 연락처를 가리지 않는다 —
// 대응이 급한 화면에서 정보를 가리면 오히려 위험하다(메인 관리자 화면 `EmergencyDetailDialog` 와 같은 판단).
export const EmergencyDetailDialog = ({ emergency, onClose, onAck, acking = false }: EmergencyDetailDialogProps) => {
  const [ackMemo, setAckMemo] = useState("");
  const canAck = onAck !== undefined && !emergency.acked && emergency.canceledAt === null;

  return (
    <Dialog
      title={`${emergency.busNo} 비상 알림 상세`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
          {canAck ? (
            <Button variant="primary" disabled={acking} onClick={() => onAck(ackMemo.trim() === "" ? undefined : ackMemo.trim())}>
              {acking ? "처리 중..." : "확인"}
            </Button>
          ) : null}
        </>
      }
    >
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
            <PhoneContact phone={emergency.raisedBy.phone} />
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
              {contact.name ?? "미상"} · <PhoneContact phone={contact.phone} />
            </span>
          </StyledEmergencyDetailRow>
        ))}
        {emergency.acked ? (
          <>
            <StyledEmergencyDetailRow>
              <span>확인자</span>
              <span>{emergency.ackedBy?.name ?? "-"}</span>
            </StyledEmergencyDetailRow>
            <StyledEmergencyDetailRow>
              <span>조치 메모</span>
              <span>{emergency.ackedBy?.memo ?? "-"}</span>
            </StyledEmergencyDetailRow>
          </>
        ) : null}
        {canAck ? (
          <Textarea
            label="조치 메모 (선택)"
            hint={`확인할 때 남깁니다 · 최대 ${ACK_MEMO_MAX_LENGTH}자 (${ackMemo.length}/${ACK_MEMO_MAX_LENGTH}) · ${FREE_TEXT_PRIVACY_NOTICE}`}
            maxLength={ACK_MEMO_MAX_LENGTH}
            rows={3}
            value={ackMemo}
            onChange={(event) => setAckMemo(event.target.value)}
          />
        ) : null}
      </StyledEmergencyDetailBody>
    </Dialog>
  );
};
