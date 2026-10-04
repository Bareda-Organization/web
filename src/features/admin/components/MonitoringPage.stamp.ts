import styled from "@emotion/styled";

export const StyledMonitoringStamp = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
`;

export const StyledMonitoringStampDot = styled.i<{ $live: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $live }) => ($live ? "var(--c-conf)" : "var(--c-move)")};
`;
