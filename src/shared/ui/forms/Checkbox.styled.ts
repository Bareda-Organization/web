import styled from "@emotion/styled";

type StyledLabelProps = {
  $disabled: boolean;
};

export const StyledLabel = styled.label<StyledLabelProps>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 44px;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
`;

// 실제 체크 입력은 시각적으로 숨기고 옆의 커스텀 박스로 보여준다 — 원본과 같은 접근성 패턴
// (키보드 포커스·스크린리더는 여전히 이 input 을 통해 동작한다).
export const StyledHiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

type StyledBoxProps = {
  $checked: boolean;
};

export const StyledBox = styled.span<StyledBoxProps>`
  width: 22px;
  height: 22px;
  flex: none;
  margin-top: 1px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  background: ${({ $checked }) => ($checked ? "var(--accent-primary)" : "var(--surface-card)")};
  border: 1px solid ${({ $checked }) => ($checked ? "var(--accent-primary)" : "var(--border-default)")};
  color: var(--text-inverse);
  transition: var(--transition-control);
`;

export const StyledLabelText = styled.span`
  display: block;
  font: var(--fw-regular) var(--fs-body-sm) / 1.5 var(--font-sans);
`;

export const StyledSublabel = styled.span`
  display: block;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  color: var(--text-secondary);
`;
