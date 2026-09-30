import styled from "@emotion/styled";

export const StyledPendingBody = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 24px;
  padding: 16px 20px;
`;

export const StyledPendingTitle = styled.strong`
  font-size: var(--fs-body);
  color: var(--text-primary);
`;

export const StyledPendingItem = styled.a`
  color: var(--text-primary);
  font-size: var(--fs-body-sm);
  text-decoration: underline;
`;

export const StyledPendingDeadline = styled.span`
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
