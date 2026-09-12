import styled from "@emotion/styled";

export const StyledWaypointPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const StyledWaypointInputRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

export const StyledWaypointCompare = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-mist);
`;

export const StyledWaypointCompareCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font: var(--fw-regular) var(--fs-body-sm) / 1.4 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledWaypointDeployedRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--surface-mist);
`;

export const StyledWaypointActionsRow = styled.div`
  display: flex;
  gap: 8px;
`;
