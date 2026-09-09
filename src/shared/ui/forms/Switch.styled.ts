import styled from "@emotion/styled";

type StyledLabelProps = {
  $disabled: boolean;
};

export const StyledLabel = styled.label<StyledLabelProps>`
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 48px;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
`;

export const StyledTextGroup = styled.span`
  flex: 1;
`;

export const StyledLabelText = styled.span`
  display: block;
  font: var(--fw-regular) var(--fs-body) / 1.5 var(--font-sans);
`;

export const StyledSublabel = styled.span`
  display: block;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledHiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

type StyledTrackProps = {
  $checked: boolean;
};

export const StyledTrack = styled.span<StyledTrackProps>`
  width: 46px;
  height: 28px;
  flex: none;
  border-radius: 999px;
  padding: 3px;
  background: ${({ $checked }) => ($checked ? "var(--accent-primary)" : "var(--stone-300)")};
  transition: background-color var(--dur-fast) var(--ease-standard);
`;

export const StyledThumb = styled.span<StyledTrackProps>`
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--white);
  box-shadow: var(--shadow-sm);
  transform: ${({ $checked }) => ($checked ? "translateX(18px)" : "translateX(0)")};
  transition: transform var(--dur-fast) var(--ease-standard);
`;
