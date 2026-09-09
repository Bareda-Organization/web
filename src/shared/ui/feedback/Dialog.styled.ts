import styled from "@emotion/styled";

export const StyledDialogOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: var(--overlay-scrim);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 40;
`;

export const StyledDialogPanel = styled.div<{ $width: number }>`
  width: 100%;
  max-width: ${(props) => props.$width}px;
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-raised);
  padding: 24px;
`;

export const StyledDialogTitle = styled.div`
  font: var(--fw-bold) 22px / 1.35 var(--font-serif);
  letter-spacing: -0.015em;
`;

export const StyledDialogBody = styled.div<{ $hasTitle: boolean }>`
  margin-top: ${(props) => (props.$hasTitle ? "10px" : "0")};
  font: var(--fw-regular) var(--fs-body-sm) / 1.7 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledDialogFooter = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 22px;
  justify-content: flex-end;
`;
