import styled from "@emotion/styled";
import { css } from "@emotion/react";
import type { StatusChipTone } from "./StatusChip";

// 면 · 글자 · 윤곽 세 값이 한 벌. 글자는 연한 면 위 4.5:1 이 나오는 어두운 단계다(--t-*).
const toneColors: Record<StatusChipTone, { bg: string; fg: string; ring: string }> = {
  end: { bg: "var(--surface-fill)", fg: "var(--stone-600)", ring: "transparent" },
  off: { bg: "var(--surface-fill)", fg: "var(--stone-600)", ring: "transparent" },
  move: { bg: "var(--amber-100)", fg: "var(--t-move)", ring: "var(--amber-300)" },
  warn: { bg: "var(--amber-100)", fg: "var(--t-move)", ring: "var(--amber-300)" },
  conf: { bg: "var(--green-100)", fg: "var(--green-600)", ring: "transparent" },
  ok: { bg: "var(--green-100)", fg: "var(--green-600)", ring: "transparent" },
  wait: { bg: "var(--green-50)", fg: "var(--green-700)", ring: "var(--green-300)" },
  bad: { bg: "var(--status-missed-soft)", fg: "var(--t-bad)", ring: "transparent" },
  info: { bg: "var(--b-info)", fg: "var(--t-info)", ring: "transparent" },
};

export const StyledStatusChip = styled.span<{ $tone: StatusChipTone; $quiet: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 9px;
  border-radius: 999px;
  font: var(--fw-bold) var(--fs-xs) / 1.5 var(--font-sans);
  white-space: nowrap;
  background: ${({ $tone }) => toneColors[$tone].bg};
  color: ${({ $tone }) => toneColors[$tone].fg};
  box-shadow: inset 0 0 0 1px ${({ $tone }) => toneColors[$tone].ring};

  ${({ $quiet, $tone }) =>
    $quiet
      ? css`
          background: transparent;
          box-shadow: none;
          padding-left: 0;
          padding-right: 0;
          font-weight: var(--fw-medium);
          color: ${$tone === "off" || $tone === "end" ? "var(--text-secondary)" : toneColors[$tone].fg};
        `
      : null}
`;

// 모양 — 색을 못 보는 사람도 구별하도록 상태마다 다른 도형을 쓴다.
const markerShape: Record<StatusChipTone, ReturnType<typeof css>> = {
  end: css`
    background: var(--c-end);
    border-radius: 2px;
  `,
  off: css`
    background: var(--c-end);
    border-radius: 2px;
  `,
  move: css`
    background: var(--c-move);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  `,
  conf: css`
    background: var(--c-conf);
    border-radius: 50%;
  `,
  ok: css`
    background: var(--c-conf);
    border-radius: 50%;
  `,
  wait: css`
    border: 2px solid var(--c-wait);
    border-radius: 50%;
  `,
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
};

export const StyledMarker = styled.i<{ $tone: StatusChipTone }>`
  display: inline-block;
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  ${({ $tone }) => markerShape[$tone]}
`;
