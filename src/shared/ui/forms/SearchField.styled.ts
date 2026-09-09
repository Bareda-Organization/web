import styled from "@emotion/styled";

export const StyledForm = styled.form`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 6px 0 14px;
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-pill);
  transition: var(--transition-control);

  &:focus-within {
    border-color: var(--focus-ring);
    box-shadow: var(--focus-shadow);
  }
`;

export const StyledSearchIcon = styled.span`
  color: var(--text-tertiary);
`;

export const StyledInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: var(--fw-regular) var(--fs-body-sm) / 1 var(--font-sans);
`;

export const StyledSubmitButton = styled.button`
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--accent-primary);
  color: var(--text-inverse);
  cursor: pointer;
  font: var(--fw-medium) var(--fs-label-sm) / 1 var(--font-sans);
`;
