import styled from "@emotion/styled";

export const StyledEmergencyAlertsLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

// 단말 기록 시각 — 접수 시각 아래의 참고 줄(R47 Ruling 744).
export const StyledEmergencyDeviceTime = styled.span`
  display: block;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
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
