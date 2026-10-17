import styled from "@emotion/styled";
import { css } from "@emotion/react";

export type ListRowTone = "bad" | "warn" | "info" | "ok";
export type TimelineTone = "end" | "ok" | "bad";

// 목록 행 · 타임라인 — 시안 kit 8절. 긴급도는 왼쪽 색 막대가 아니라 앞쪽 모양(◆ 위험 · ▲ 주의 · ⓘ 정보 · ● 이상 없음)으로 말한다.

export const StyledListRows = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const rowMarker: Record<ListRowTone, ReturnType<typeof css>> = {
  bad: css`
    background: var(--c-bad);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  `,
  warn: css`
    background: var(--c-move);
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  `,
  info: css`
    border: 2px solid var(--t-info);
    border-radius: 50%;
    background: radial-gradient(var(--t-info) 1.5px, transparent 2px);
  `,
  ok: css`
    background: var(--c-conf);
    border-radius: 50%;
  `,
};

export const StyledListRow = styled.li<{ $tone?: ListRowTone }>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px var(--s3);
  align-items: center;
  padding: var(--s3) 0 var(--s3) 26px;
  border-bottom: 1px solid var(--border-subtle);

  &:last-of-type {
    border-bottom: 0;
  }

  &::before {
    content: "";
    position: absolute;
    left: 4px;
    top: 17px;
    width: 11px;
    height: 11px;
    ${({ $tone }) => ($tone ? rowMarker[$tone] : null)}
  }
`;

export const StyledListRowTitle = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font: var(--fw-bold) var(--fs-md) / 1.5 var(--font-sans);
`;

export const StyledListRowDescription = styled.div`
  grid-column: 1;
  font: var(--fw-regular) var(--fs-xs) / 1.5 var(--font-sans);
  color: var(--text-secondary);
  text-wrap: pretty;
`;

// 오른쪽 큰 숫자(처리 건수) 또는 동작 버튼
export const StyledListRowSide = styled.div<{ $isCount: boolean }>`
  grid-row: 1 / span 2;
  grid-column: 2;
  text-align: right;
  ${({ $isCount }) =>
    $isCount
      ? css`
          font: var(--fw-bold) var(--fs-xl) / 1 var(--font-sans);
          font-variant-numeric: tabular-nums;
        `
      : null}
`;

const dot: Record<TimelineTone, ReturnType<typeof css>> = {
  end: css`
    background: var(--surface-card);
    box-shadow: 0 0 0 2px var(--c-end);
  `,
  ok: css`
    background: var(--c-conf);
    box-shadow: 0 0 0 2px var(--c-conf);
  `,
  bad: css`
    background: var(--c-bad);
    box-shadow: 0 0 0 2px var(--c-bad);
  `,
};

// 세로 줄은 1px(2px 이상의 한쪽 선은 막대로 읽힌다)
export const StyledTimeline = styled.ul`
  margin: 0;
  padding: 0 0 0 18px;
  list-style: none;
  border-left: 1px solid var(--border-default);
  font-size: var(--fs-sm);
`;

export const StyledTimelineItem = styled.li<{ $tone: TimelineTone }>`
  position: relative;
  padding: 0 0 14px 4px;

  &::before {
    content: "";
    position: absolute;
    left: -24px;
    top: 4px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    ${({ $tone }) => dot[$tone]}
  }
`;

export const StyledTimelineMeta = styled.div`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;
