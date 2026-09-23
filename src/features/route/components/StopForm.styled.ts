import styled from "@emotion/styled";

export const StyledStopForm = styled.section`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-mist);
`;

export const StyledFormTitle = styled.h3`
  margin: 0;
  font: var(--fw-bold) var(--fs-body) / 1.3 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledFormHint = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font: var(--fw-regular) var(--fs-micro) / 1.5 var(--font-sans);
`;

export const StyledFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
