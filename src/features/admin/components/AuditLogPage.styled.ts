import styled from "@emotion/styled";

export const StyledAuditLogLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledFilterRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

export const StyledFilterField = styled.div`
  min-width: 160px;
`;

export const StyledActorSearchField = styled(StyledFilterField)`
  min-width: 300px;
`;

export const StyledFieldLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
  color: var(--text-secondary);
`;
