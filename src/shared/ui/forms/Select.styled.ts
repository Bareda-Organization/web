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

export const StyledFieldWrap = styled.span`
  position: relative;
  display: block;
`;

export const StyledSelect = styled.select`
  width: 100%;
  height: 48px;
  padding: 0 40px 0 14px;
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  font: var(--fw-regular) var(--fs-body) / 1 var(--font-sans);
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: var(--transition-control);

  &:focus {
    border-color: var(--focus-ring);
    box-shadow: var(--focus-shadow);
  }
`;

export const StyledChevron = styled.span`
  position: absolute;
  right: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
`;

export const StyledHint = styled.span`
  display: block;
  margin-top: 6px;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  color: var(--text-secondary);
`;
