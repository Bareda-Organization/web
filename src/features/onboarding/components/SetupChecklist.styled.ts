import styled from "@emotion/styled";

export const StyledChecklistBody = styled.div`
  display: grid;
  gap: 12px;
  padding: 16px 20px;
`;

export const StyledChecklistTitle = styled.strong`
  font-size: var(--fs-body);
  color: var(--text-primary);
`;

export const StyledChecklistHint = styled.p`
  margin: 0;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;

export const StyledChecklistList = styled.ol`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const StyledChecklistLink = styled.a`
  color: var(--text-primary);
  font-size: var(--fs-body-sm);
  text-decoration: underline;
`;

export const StyledChecklistDone = styled.span`
  color: var(--status-boarded);
  font-size: var(--fs-body-sm);
`;
