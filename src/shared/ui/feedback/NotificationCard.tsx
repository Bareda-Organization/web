import type { HTMLAttributes } from "react";
import { StatusPill } from "../core/StatusPill";
import { Icon } from "../core/Icon";
import {
  StyledNotificationCard,
  StyledNotificationCardBody,
  StyledNotificationCardHeader,
  StyledNotificationCardUnreadDot,
  StyledNotificationCardTime,
  StyledNotificationCardTitle,
  StyledNotificationCardMeta,
  StyledNotificationCardSub,
  StyledNotificationCardChevron,
} from "./NotificationCard.styled";

export type NotificationCardProps = HTMLAttributes<HTMLDivElement> & {
  status?: "boarded" | "moving" | "missed" | "idle";
  /** pill 안 문구. 비우면 상태 기본 라벨 */
  statusLabel?: string;
  /** 결론 한 줄. 예: '하준이가 승차했어요' */
  title?: string;
  /** 시각 · 정류장. 예: '8:37 · 한화아파트 정류장' */
  meta?: string;
  /** 보조 한 줄. 예: '도착 예정 8:58' */
  sub?: string;
  /** 오른쪽 위 상대 시각 */
  time?: string;
  unread?: boolean;
};

// 학부모·학생 앱 알림 카드 — 제목은 세리프, 시각·정류장은 산세리프.
// 알림 타임라인의 기본 항목: 누가 → 무엇을 → 언제 → 어디서 순서로 채운다.
export const NotificationCard = ({
  status = "boarded",
  statusLabel,
  title,
  meta,
  sub,
  time,
  unread,
  onClick,
  ...rest
}: NotificationCardProps) => {
  return (
    <StyledNotificationCard $clickable={Boolean(onClick)} onClick={onClick} {...rest}>
      <StyledNotificationCardBody>
        <StyledNotificationCardHeader>
          <StatusPill status={status}>{statusLabel}</StatusPill>
          {unread ? <StyledNotificationCardUnreadDot /> : null}
          {time ? <StyledNotificationCardTime>{time}</StyledNotificationCardTime> : null}
        </StyledNotificationCardHeader>
        <StyledNotificationCardTitle>{title}</StyledNotificationCardTitle>
        {meta ? <StyledNotificationCardMeta>{meta}</StyledNotificationCardMeta> : null}
        {sub ? <StyledNotificationCardSub>{sub}</StyledNotificationCardSub> : null}
      </StyledNotificationCardBody>
      {onClick ? (
        <StyledNotificationCardChevron>
          <Icon name="chevron-right" size={20} />
        </StyledNotificationCardChevron>
      ) : null}
    </StyledNotificationCard>
  );
};
