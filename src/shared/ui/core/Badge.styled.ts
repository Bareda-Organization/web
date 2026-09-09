import styled from "@emotion/styled";
import { css } from "@emotion/react";
import type { BadgeTone } from "./Badge";

// neutral 은 stone 토큰, 나머지는 status/accent 토큰을 각각 다른 조합으로 참조해
// StatusPill 처럼 이름 조립으로 줄일 수 없다 — 원본 badgeTone 맵을 그대로 옮긴다.
const toneStyle: Record<BadgeTone, ReturnType<typeof css>> = {
  neutral: css`
    background: var(--stone-100);
    color: var(--stone-600);
  `,
  brand: css`
    background: var(--accent-primary-soft);
    color: var(--text-brand);
  `,
  amber: css`
    background: var(--status-moving-soft);
    color: var(--status-moving);
  `,
  red: css`
    background: var(--status-missed-soft);
    color: var(--status-missed);
  `,
  added: css`
    background: var(--status-boarded-soft);
    color: var(--status-boarded);
  `,
  removed: css`
    background: var(--status-missed-soft);
    color: var(--status-missed);
  `,
};

type StyledBadgeProps = {
  $tone: BadgeTone;
  $isCount: boolean;
};

export const StyledBadge = styled.span<StyledBadgeProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${({ $isCount }) => ($isCount ? "20px" : "auto")};
  height: ${({ $isCount }) => ($isCount ? "20px" : "auto")};
  padding: ${({ $isCount }) => ($isCount ? "0 6px" : "3px 8px")};
  border-radius: var(--radius-pill);
  font: var(--fw-bold) var(--fs-label-sm) / 1 var(--font-sans);
  ${({ $tone }) => toneStyle[$tone]}
`;
