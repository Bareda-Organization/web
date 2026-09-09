import styled from "@emotion/styled";

export const StyledRunSummaryCard = styled.div<{ $clickable: boolean }>`
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 20px;
  cursor: ${(props) => (props.$clickable ? "pointer" : undefined)};
`;

export const StyledRunSummaryCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const StyledRunSummaryCardBusLeg = styled.span`
  margin-left: auto;
  font: var(--fw-bold) var(--fs-label-sm) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledRunSummaryCardEta = styled.div`
  margin-top: 12px;
  font: var(--fw-bold) 26px / 1.3 var(--font-serif);
  letter-spacing: -0.015em;
`;

export const StyledRunSummaryCardGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export const StyledRunSummaryCardCell = styled.div`
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  padding: 12px 14px;
`;

export const StyledRunSummaryCardCellLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font: var(--fw-medium) var(--fs-micro) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledRunSummaryCardCellValue = styled.div`
  margin-top: 6px;
  font: var(--fw-medium) var(--fs-body-sm) / 1.3 var(--font-sans);
`;

export const StyledRunSummaryCardCrew = styled.div`
  margin-top: 14px;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: var(--text-secondary);
`;
