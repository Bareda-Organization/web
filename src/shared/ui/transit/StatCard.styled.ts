import styled from "@emotion/styled";

export const StyledStatCard = styled.div`
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 18px;
`;

export const StyledStatCardLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font: var(--fw-medium) var(--fs-micro) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledStatCardValueRow = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

export const StyledStatCardValue = styled.span<{ $color: string }>`
  font: var(--fw-bold) 30px / 1 var(--font-sans);
  font-variant-numeric: tabular-nums;
  color: ${(props) => props.$color};
`;

export const StyledStatCardUnit = styled.span`
  font: var(--fw-medium) var(--fs-body-sm) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledStatCardSub = styled.div`
  margin-top: 6px;
  font: var(--fw-light) var(--fs-micro) / 1.4 var(--font-sans);
  color: var(--text-tertiary);
`;
