import styled from "@emotion/styled";

export const StyledWrap = styled.div``;

export const StyledLabel = styled.span`
  display: block;
  margin-bottom: 8px;
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledFieldWrap = styled.div`
  position: relative;
`;

// 실제 입력은 칸 전체를 덮는 투명 input 하나뿐이고, 아래 칸들은 그 값을 문자 단위로 보여주는
// 표시 전용 레이어다 — 원본과 같은 "숨긴 input + 표시용 칸" 패턴.
export const StyledHiddenInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: text;
`;

export const StyledCharRow = styled.div`
  display: flex;
  gap: 8px;
`;

type StyledCharProps = {
  $filled: boolean;
  $error: boolean;
};

export const StyledChar = styled.span<StyledCharProps>`
  flex: 1;
  height: 56px;
  display: grid;
  place-items: center;
  background: var(--surface-card);
  border: 1px solid
    ${({ $error, $filled }) => ($error ? "var(--status-missed)" : $filled ? "var(--accent-primary)" : "var(--border-default)")};
  border-radius: var(--radius-control);
  font: var(--fw-bold) 24px / 1 var(--font-sans);
  letter-spacing: 0;
  color: var(--text-primary);
  transition: var(--transition-control);
`;

type StyledHelperTextProps = {
  $error: boolean;
};

export const StyledHelperText = styled.span<StyledHelperTextProps>`
  display: block;
  margin-top: 8px;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  color: ${({ $error }) => ($error ? "var(--status-missed)" : "var(--text-secondary)")};
`;
