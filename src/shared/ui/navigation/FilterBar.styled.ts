import styled from "@emotion/styled";

export const StyledFilterBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin-bottom: var(--s4);
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
