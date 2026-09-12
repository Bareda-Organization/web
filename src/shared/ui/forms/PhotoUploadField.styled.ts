import styled from "@emotion/styled";

export const StyledWrap = styled.div`
  display: block;
`;

export const StyledLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

export const StyledPreview = styled.div`
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-mist);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const StyledHiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
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
