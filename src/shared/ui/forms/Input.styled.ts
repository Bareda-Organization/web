import styled from "@emotion/styled";

// 입력 · 선택 · 여러 줄이 같은 규칙을 쓴다(시안 kit 9절) — 테두리는 진한 보조색(대비 확보), 호버는 검정, 초점은 초록 2px 고리,
// 오류는 빨강 테두리 + 안쪽 1px 한 겹(색에만 의존하지 않게 오류 문구가 아래에 붙는다), 꺼짐은 점선 + 읽히는 글자.
export const StyledWrap = styled.label`
  display: grid;
  gap: var(--s2);
  align-content: start;
`;

export const StyledLabel = styled.span`
  font: var(--fw-medium) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledRequiredMark = styled.span`
  margin-left: 2px;
  color: var(--t-bad);
`;

export const StyledFieldWrap = styled.span`
  position: relative;
  display: block;
`;

export const StyledLeadingIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
`;

type StyledInputProps = {
  $hasIcon: boolean;
  $hasSuffix: boolean;
  $error: boolean;
};

export const StyledInput = styled.input<StyledInputProps>`
  width: 100%;
  height: 36px;
  padding: 0 ${({ $hasSuffix }) => ($hasSuffix ? "44px" : "12px")} 0 ${({ $hasIcon }) => ($hasIcon ? "32px" : "12px")};
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid ${({ $error }) => ($error ? "var(--c-bad)" : "var(--text-secondary)")};
  box-shadow: ${({ $error }) => ($error ? "inset 0 0 0 1px var(--c-bad)" : "none")};
  border-radius: var(--radius-control);
  font: var(--fw-regular) var(--fs-md) / 1.4 var(--font-sans);
  transition:
    border-color var(--dur-ui) var(--ease-out),
    box-shadow var(--dur-ui) var(--ease-out);

  &::placeholder {
    color: var(--text-secondary);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      border-color: ${({ $error }) => ($error ? "var(--c-bad)" : "var(--text-primary)")};
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
    box-shadow: none;
    cursor: not-allowed;
  }
`;

export const StyledSuffix = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font: var(--fw-regular) var(--fs-sm) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

type StyledHelperTextProps = {
  $error: boolean;
};

export const StyledHelperText = styled.span<StyledHelperTextProps>`
  font: ${({ $error }) => ($error ? "var(--fw-medium)" : "var(--fw-regular)")} var(--fs-xs) / 1.5 var(--font-sans);
  color: ${({ $error }) => ($error ? "var(--t-bad)" : "var(--text-secondary)")};
  text-wrap: pretty;
`;
