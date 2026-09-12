import styled from "@emotion/styled";

export const StyledEmergencyLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledEmergencyFilters = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

export const StyledEmergencyPosition = styled.span`
  font-family: var(--font-sans);
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
