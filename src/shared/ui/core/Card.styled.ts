import styled from "@emotion/styled";
import { css } from "@emotion/react";
import type { CardAccent, CardTone } from "./Card";

const toneStyle: Record<CardTone, ReturnType<typeof css>> = {
  base: css`
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
    border: none;
  `,
  mist: css`
    background: var(--bg-subtle);
    box-shadow: none;
    border: none;
  `,
  outline: css`
    background: var(--surface-card);
    box-shadow: none;
    border: 1px solid var(--border-subtle);
  `,
  inverse: css`
    background: var(--surface-inverse);
    box-shadow: var(--shadow-card);
    border: none;
    color: var(--text-inverse);
  `,
};

type StyledCardProps = {
  $tone: CardTone;
  $padding: number;
  $accent?: CardAccent;
  $clickable: boolean;
};

// 상태 강조는 accent(카드 상단 3px 라인)로만 — 왼쪽 컬러 보더 패턴은 이 브랜드에 없다
// (readme.md "모서리·테두리·카드" 절). accent 값은 --status-<accent> 토큰 이름과 그대로 맞물린다.
export const StyledCard = styled.div<StyledCardProps>`
  border-radius: var(--radius-card);
  padding: ${({ $padding }) => $padding}px;
  transition: var(--transition-control);
  ${({ $tone }) => toneStyle[$tone]}
  ${({ $clickable }) => ($clickable ? css`cursor: pointer;` : null)}
  ${({ $accent }) => ($accent ? css`border-top: 3px solid var(--status-${$accent});` : null)}
`;
