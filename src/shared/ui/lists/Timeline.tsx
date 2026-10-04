import type { HTMLAttributes, ReactNode } from "react";
import { StyledTimeline, StyledTimelineItem, StyledTimelineMeta } from "./lists.styled";
import type { TimelineTone } from "./lists.styled";

export type TimelineEntry = {
  /** ok 정상 처리(채운 초록 점) · bad 실패·거절(채운 빨강 점) · end 요청·대기(빈 점) */
  tone?: TimelineTone;
  title: ReactNode;
  /** 시각 · 처리자 한 줄 */
  meta?: ReactNode;
};

/** 타임라인 — 1px 세로 줄에 점이 붙는다. 승인 → 자동 거절 → 요청처럼 한 건의 처리 순서. */
export const Timeline = ({ items, ...rest }: HTMLAttributes<HTMLUListElement> & { items: TimelineEntry[] }) => (
  <StyledTimeline {...rest}>
    {items.map((item, index) => (
      <StyledTimelineItem key={index} $tone={item.tone ?? "end"}>
        <div>{item.title}</div>
        {item.meta ? <StyledTimelineMeta>{item.meta}</StyledTimelineMeta> : null}
      </StyledTimelineItem>
    ))}
  </StyledTimeline>
);
