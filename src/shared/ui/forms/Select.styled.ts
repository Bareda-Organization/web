import styled from "@emotion/styled";

export const StyledWrap = styled.label`
  display: grid;
  gap: var(--s2);
  align-content: start;
`;

export const StyledLabel = styled.span`
  font: var(--fw-medium) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledFieldWrap = styled.span`
  position: relative;
  display: block;
`;

export const StyledSelect = styled.select`
  width: 100%;
  height: 36px;
  padding: 0 34px 0 12px;
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--text-secondary);
  border-radius: var(--radius-control);
  font: var(--fw-regular) var(--fs-md) / 1.4 var(--font-sans);
  appearance: none;
  cursor: pointer;
  transition:
    border-color var(--dur-ui) var(--ease-out),
    box-shadow var(--dur-ui) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      border-color: var(--text-primary);
    }
  }

  &:focus {
    outline: 2px solid var(--focus-ring);
    outline-offset: 0;
    border-color: var(--focus-ring);
  }

  &:disabled {
    background: var(--surface-fill);
    color: var(--text-secondary);
    border-style: dashed;
    border-color: var(--border-default);
    cursor: not-allowed;
  }
`;

export const StyledChevron = styled.span`
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
`;

export const StyledHint = styled.span`
  font: var(--fw-regular) var(--fs-xs) / 1.5 var(--font-sans);
  color: var(--text-secondary);
  text-wrap: pretty;
`;
