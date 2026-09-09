import styled from "@emotion/styled";

export const StyledWrap = styled.label`
  display: block;
`;

export const StyledLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledTextarea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  resize: vertical;
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  outline: none;
  font: var(--fw-regular) var(--fs-body) / var(--lh-body) var(--font-sans);
  transition: var(--transition-control);

  &:focus {
    border-color: var(--focus-ring);
    box-shadow: var(--focus-shadow);
  }
`;

export const StyledHint = styled.span`
  display: block;
  margin-top: 6px;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  color: var(--text-secondary);
`;
