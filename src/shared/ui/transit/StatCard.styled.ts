import styled from "@emotion/styled";

export const StyledStatCard = styled.div`
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 20px var(--s4);
`;

export const StyledStatCardLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  letter-spacing: 0.02em;
  color: var(--text-secondary);
`;

export const StyledStatCardValueRow = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

export const StyledStatCardValue = styled.span<{ $color: string }>`
  font: var(--fw-bold) var(--fs-num) / 1.1 var(--font-sans);
  font-variant-numeric: tabular-nums;
  color: ${(props) => props.$color};
`;

export const StyledStatCardUnit = styled.span`
  font: var(--fw-regular) var(--fs-sm) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledStatCardSub = styled.div`
  margin-top: 6px;
  font: var(--fw-regular) var(--fs-xs) / 1.45 var(--font-sans);
  color: var(--text-secondary);
`;
