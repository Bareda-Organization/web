import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { Icon } from "../core/Icon";
import { StatusPill } from "../core/StatusPill";
import {
  StyledStudentRow,
  StyledStudentRowAvatar,
  StyledStudentRowBody,
  StyledStudentRowName,
  StyledStudentRowMeta,
  StyledStudentRowCall,
} from "./StudentRow.styled";

export type StudentRowProps = HTMLAttributes<HTMLDivElement> & {
  name?: string;
  /** 정류장 · 반 · 보호자 등 한 줄 */
  meta?: string;
  phone?: string;
  /** 동승자 앱이 결정하는 탑승 상태 */
  ride?: "boarded" | "alighted" | "absent" | "missed" | "waiting";
  selected?: boolean;
  onSelect?: () => void;
  onCall?: () => void;
  /** 상태 pill 대신 넣을 컨트롤 (탑승/미등원/하차 전환 버튼) */
  actions?: ReactNode;
};

const RIDE_META: Record<string, { label: string; status: "boarded" | "moving" | "missed" | "idle" }> = {
  boarded: { label: "탑승 완료", status: "boarded" },
  alighted: { label: "하차 완료", status: "boarded" },
  absent: { label: "미등원", status: "idle" },
  missed: { label: "미탑승", status: "missed" },
  waiting: { label: "대기", status: "idle" },
};

// 학생 한 명 행 — 로스터·탑승 목록 공통.
export const StudentRow = ({
  name,
  meta,
  phone,
  ride = "waiting",
  selected,
  onSelect,
  onCall,
  actions,
  ...rest
}: StudentRowProps) => {
  const rideMeta = RIDE_META[ride] ?? RIDE_META.waiting;
  const handleCall = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onCall?.();
  };
  return (
    // 원본은 `{...rest} style={...} onClick={onSelect}` 순서라 onClick 이 항상 우선한다 — 그대로 보존.
    <StyledStudentRow {...rest} $selected={Boolean(selected)} $clickable={Boolean(onSelect)} onClick={onSelect}>
      <StyledStudentRowAvatar>{name ? name.slice(-2) : ""}</StyledStudentRowAvatar>
      <StyledStudentRowBody>
        <StyledStudentRowName>{name}</StyledStudentRowName>
        {meta ? <StyledStudentRowMeta>{meta}</StyledStudentRowMeta> : null}
      </StyledStudentRowBody>
      {phone && onCall ? (
        <StyledStudentRowCall type="button" onClick={handleCall} aria-label="보호자에게 연락">
          <Icon name="phone" size={16} />
        </StyledStudentRowCall>
      ) : null}
      {actions || (
        <StatusPill status={rideMeta.status} showIcon={false}>
          {rideMeta.label}
        </StatusPill>
      )}
    </StyledStudentRow>
  );
};
