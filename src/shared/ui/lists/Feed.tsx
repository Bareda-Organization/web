import type { HTMLAttributes, ReactNode } from "react";
import { StyledFeed, StyledFeedTime } from "./lists.styled";

export type FeedItem = { time: string; text: ReactNode };

/** 최근 기록 — 시각(왼쪽 48px) + 한 줄 사건. */
export const Feed = ({ items, ...rest }: HTMLAttributes<HTMLUListElement> & { items: FeedItem[] }) => (
  <StyledFeed {...rest}>
    {items.map((item, index) => (
      <li key={`${item.time}-${index}`}>
        <StyledFeedTime>{item.time}</StyledFeedTime>
        <span>{item.text}</span>
      </li>
    ))}
  </StyledFeed>
);
