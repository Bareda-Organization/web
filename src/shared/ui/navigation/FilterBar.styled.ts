import styled from "@emotion/styled";

export const StyledFilterBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 22px;
  /* 아래 간격은 쓰는 화면의 레이아웃(gap · 위아래 여백)이 쥔다 — 여기서도 주면 두 여백이 겹쳐 시안(16px)보다 벌어진다 */
`;

export const StyledFilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  letter-spacing: 0.02em;
  color: var(--text-secondary);
`;

export const StyledFilterSummary = styled.span`
  margin-left: auto;
  font: var(--fw-regular) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
`;
