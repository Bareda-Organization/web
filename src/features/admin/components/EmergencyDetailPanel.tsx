"use client";

import { MapSurface } from "@/features/map";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { deviceTimeNote } from "@/shared/lib/format/deviceTimeNote";
import { formatRole } from "@/shared/lib/format/roleLabel";
import { Card, StatusChip } from "@/shared/ui";
import { DefinitionList, LinkButton } from "@/shared/ui/display";
import { emergencyTypeLabel, unackedElapsedText } from "../lib/emergencyType";
import { academyDotColor } from "../lib/relativeTime";
import type { EmergencyItemResponseTypes } from "../types";
import {
  StyledAckLine,
  StyledAcademyDot,
  StyledAcademyLine,
  StyledContactList,
  StyledContactRow,
  StyledEmergencyDeviceTime,
  StyledMiniMap,
  StyledPanelBody,
  StyledPanelTitle,
} from "./EmergencyAlertsPage.styled";

const directionText = (direction: EmergencyItemResponseTypes["direction"]) => (direction === "to_academy" ? "등원" : "하원");

// 초 → "N분" — 1분 미만은 그대로 알린다.
const minutesText = (seconds: number): string => (seconds < 60 ? "1분 미만" : `${Math.floor(seconds / 60)}분`);

const ackText = (emergency: EmergencyItemResponseTypes): string => {
  const who = emergency.ackedBy?.name ?? "-";
  const after = emergency.ackedAt ? `발신 ${minutesText((Date.parse(emergency.ackedAt) - Date.parse(emergency.raisedAt)) / 1000)} 뒤` : null;
  const memo = emergency.ackedBy?.memo ? `조치 메모: ${emergency.ackedBy.memo}` : null;
  return [who, after, memo].filter(Boolean).join(" · ");
};

// §6.11 상세 — 목록에 다 못 담는 위치·연락처·메모를 오른쪽 상시 칸에 보인다. 비상 상황이라는 맥락상
// §6.13 감사 이력과 달리 연락처를 마스킹하지 않는다(판단 근거, 보고서 §1) — 대응이 급한 화면에서 정보를 가리면 오히려 위험하다.
export const EmergencyDetailPanel = ({ emergency }: { emergency: EmergencyItemResponseTypes }) => {
  const deviceNote = deviceTimeNote(emergency.raisedAt, emergency.occurredAt);
  const canceled = emergency.canceledAt !== null;
  const people = [{ name: emergency.raisedBy.name ?? "미상", role: formatRole(emergency.raisedBy.role), phone: emergency.raisedBy.phone }, ...emergency.contacts.map((contact) => ({
    name: contact.name ?? "미상",
    role: formatRole(contact.role),
    phone: contact.phone,
  }))];

  return (
    <Card padding={0} role="region" aria-label="비상 상세">
      <StyledPanelBody>
        <StyledPanelTitle>
          <h3>
            {emergency.busNo} · {directionText(emergency.direction)} · {emergencyTypeLabel(emergency.type)}
          </h3>
          {canceled ? <StatusChip tone="end">취소됨</StatusChip> : emergency.staffAcked ? <StatusChip tone="conf">확인됨</StatusChip> : <StatusChip tone="bad">미확인</StatusChip>}
        </StyledPanelTitle>

        <StyledMiniMap>
          {emergency.position ? (
            <MapSurface
              camera={{ lat: emergency.position.lat, lng: emergency.position.lng, zoom: 16 }}
              markers={[{ id: emergency.runId, lat: emergency.position.lat, lng: emergency.position.lng, kind: "bus", busNo: emergency.busNo, direction: emergency.direction, emergency: true }]}
              fitToContent={false}
            />
          ) : (
            "발신 위치를 확인할 수 없습니다"
          )}
        </StyledMiniMap>

        <DefinitionList
          items={[
            {
              term: "학원",
              value: (
                <StyledAcademyLine>
                  <StyledAcademyDot $color={academyDotColor(emergency.academy.name)} aria-hidden="true" />
                  {emergency.academy.name}
                </StyledAcademyLine>
              ),
            },
            {
              term: "발신 시각",
              value: (
                <>
                  {formatDateTime(emergency.raisedAt)} <StyledAckLine>단말 시각과 다르면 접수 시각 기준</StyledAckLine>
                  {deviceNote ? <StyledEmergencyDeviceTime>{deviceNote}</StyledEmergencyDeviceTime> : null}
                </>
              ),
            },
            { term: "발신자", value: `${emergency.raisedBy.name ?? "미상"} (${formatRole(emergency.raisedBy.role)}) · ${emergency.raisedBy.phone ?? "번호 없음"}` },
            { term: "탑승 인원", value: `${emergency.riderCount}명` },
            { term: "메모", value: emergency.memo ?? "-" },
            { term: "발신 위치", value: emergency.position ? `${emergency.position.lat}, ${emergency.position.lng}` : "위치 확인 불가" },
            {
              term: "학원 확인",
              value: canceled ? (
                <StyledAckLine>
                  <StatusChip tone="end">취소됨</StatusChip>발신자가 취소했습니다
                </StyledAckLine>
              ) : emergency.staffAcked ? (
                <StyledAckLine>
                  <StatusChip tone="conf">확인됨</StatusChip>
                  {ackText(emergency)}
                </StyledAckLine>
              ) : (
                <StyledAckLine>
                  <StatusChip tone="bad">{`미확인 · ${unackedElapsedText(emergency.elapsedSinceRaised)}`}</StatusChip>학원 관계자가 아직 응답하지 않음
                </StyledAckLine>
              ),
            },
          ]}
        />

        <StyledContactList>
          <h3>바로 연락</h3>
          {people.map((person, index) => (
            <StyledContactRow key={`${person.role}-${index}`}>
              <div>
                <b>{person.name}</b>
                <small>{person.role}</small>
                <span>{person.phone ?? "번호 없음"}</span>
              </div>
              {person.phone ? (
                <LinkButton href={`tel:${person.phone}`} aria-label={`${person.name} 전화`}>
                  전화
                </LinkButton>
              ) : null}
            </StyledContactRow>
          ))}
          <StyledContactRow>
            <div>
              <b>학원 대표</b>
              <small>{emergency.academy.name}</small>
              <span>{emergency.academy.contact ?? "연락처 미등록"}</span>
            </div>
            {emergency.academy.contact ? (
              <LinkButton href={`tel:${emergency.academy.contact}`} aria-label="학원 대표 전화">
                전화
              </LinkButton>
            ) : null}
          </StyledContactRow>
        </StyledContactList>
      </StyledPanelBody>
    </Card>
  );
};

// 이 파일 밖에서 쓰는 보조 — 목록 첫 줄의 "HH:mm 발신" 표기.
export const raisedClock = (raisedAt: string): string => `${formatClockTime(raisedAt)} 발신`;
