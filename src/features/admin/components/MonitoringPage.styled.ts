import styled from "@emotion/styled";

export const StyledMonitoringLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledFilterRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: 320px;
`;

export const StyledMapSurface = styled.div`
  height: 220px;
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  border: 1px dashed var(--border-default);
`;

export const StyledRosterStopBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--border-subtle);

  &:first-of-type {
    border-top: none;
  }
`;

export const StyledRosterStopTitle = styled.p`
  font-weight: var(--fw-bold);
`;

export const StyledRosterStudentRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
