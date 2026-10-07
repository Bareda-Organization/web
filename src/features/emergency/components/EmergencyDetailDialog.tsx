"use client";

import { useState } from "react";
import { Button, Drawer, StatusChip, Textarea, Timeline } from "@/shared/ui";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { deviceTimeNote } from "@/shared/lib/format/deviceTimeNote";
import { EMERGENCY_ROLE_LABEL, EMERGENCY_TYPE_LABEL } from "../lib/emergencyLabels";
import { emergencyMapUrl } from "../lib/mapLink";
import { FREE_TEXT_PRIVACY_NOTICE } from "@/shared/lib/freeTextNotice";
import type { EmergencyItemResponseTypes } from "../types";
import { PhoneContact } from "./PhoneContact";
import { StyledEmergencyDetailBody, StyledEmergencyDetailRow } from "./EmergencyDetailDialog.styled";
import { StyledEmergencyDeviceTime } from "./EmergencyList.styled";

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
  const deviceNote = deviceTimeNote(emergency.raisedAt, emergency.occurredAt);
  const mapUrl = emergencyMapUrl(emergency.position);

  return (
    // 옆 패널 — 목록을 그대로 두고 연락처 · 메모 · 확인이 한 화면에 있다(대화상자는 열었다 닫는 두 단계 + 목록을 가렸다). 닫기는 머리의 ×.
    <Drawer
      title={`${emergency.busNo} 비상 알림 상세`}
      onClose={onClose}
      footer={
        canAck ? (
          <Button variant="primary" icon="circle-check" disabled={acking} onClick={() => onAck(ackMemo.trim() === "" ? undefined : ackMemo.trim())}>
            {acking ? "처리 중..." : "확인"}
          </Button>
        ) : null
      }
    >
      <StyledEmergencyDetailBody>
        <StatusChip tone="bad">{EMERGENCY_TYPE_LABEL[emergency.type]}</StatusChip>
        <StyledEmergencyDetailRow>
          <span>발생 시각</span>
          <span>
            {formatDateTime(emergency.raisedAt)}
            {deviceNote ? <StyledEmergencyDeviceTime>{deviceNote}</StyledEmergencyDeviceTime> : null}
          </span>
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
          {mapUrl ? (
            <a href={mapUrl} target="_blank" rel="noreferrer">
              지도에서 보기
            </a>
          ) : (
            <span>위치 확인 불가</span>
          )}
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
        <Timeline
          aria-label="처리 순서"
          items={[
            { tone: "bad", title: `${formatDateTime(emergency.raisedAt)} 접수`, meta: `${emergency.raisedBy.name ?? "미상"}(${EMERGENCY_ROLE_LABEL[emergency.raisedBy.role]})가 발신${deviceNote ? ` · ${deviceNote}` : ""}` },
            emergency.acked
              ? { tone: "ok", title: `${formatDateTime(emergency.ackedAt)} 확인${emergency.ackedBy?.name ? ` · ${emergency.ackedBy.name}` : ""}` }
              : { tone: "end", title: "학원 확인 대기", meta: '[확인]을 누르면 발신자 앱에 "학원이 확인했습니다"가 표시됩니다' },
          ]}
        />
      </StyledEmergencyDetailBody>
    </Drawer>
  );
};
