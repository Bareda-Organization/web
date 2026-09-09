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

export const StyledRequiredMark = styled.span`
  color: var(--status-missed);
`;

export const StyledFieldWrap = styled.span`
  position: relative;
  display: block;
`;

export const StyledLeadingIcon = styled.span`
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
`;

type StyledInputProps = {
  $hasIcon: boolean;
  $hasSuffix: boolean;
  $error: boolean;
};

// 원본은 focus 를 onFocus/onBlur state 로 감시했다 — input 은 네이티브 :focus 의사 클래스를
// 쓸 수 있으므로 그대로 옮긴다 (Button.styled.ts 와 같은 판단).
export const StyledInput = styled.input<StyledInputProps>`
  width: 100%;
  height: 48px;
  padding: 0 ${({ $hasSuffix }) => ($hasSuffix ? "56px" : "14px")} 0 ${({ $hasIcon }) => ($hasIcon ? "42px" : "14px")};
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid ${({ $error }) => ($error ? "var(--status-missed)" : "var(--border-default)")};
  border-radius: var(--radius-control);
  font: var(--fw-regular) var(--fs-body) / 1 var(--font-sans);
  outline: none;
  transition: var(--transition-control);

  &:focus {
    border-color: ${({ $error }) => ($error ? "var(--status-missed)" : "var(--focus-ring)")};
    box-shadow: var(--focus-shadow);
  }
`;

export const StyledSuffix = styled.span`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font: var(--fw-light) var(--fs-caption) / 1 var(--font-sans);
  color: var(--text-tertiary);
`;

type StyledHelperTextProps = {
  $error: boolean;
};

export const StyledHelperText = styled.span<StyledHelperTextProps>`
  display: block;
  margin-top: 6px;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: ${({ $error }) => ($error ? "var(--status-missed)" : "var(--text-secondary)")};
`;
