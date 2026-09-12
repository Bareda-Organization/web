import styled from "@emotion/styled";

export const StyledEmergencyAlertsLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledEmergencyHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const StyledEmergencyDetailBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const StyledEmergencyDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
