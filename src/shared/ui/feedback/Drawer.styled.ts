import styled from "@emotion/styled";
import { fadeIn, scrimIn, slideIn } from "./overlayMotion";

// 옆 패널(40)은 확인 대화상자(50) 아래에 깔린다 — 패널 안에서 확인 창을 띄우는 흐름이 있다.
export const StyledDrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: var(--overlay-scrim);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  z-index: 40;
  animation: ${scrimIn} var(--dur-ui) var(--ease-out);
`;

export const StyledDrawerPanel = styled.div<{ $width: number }>`
  width: ${(props) => props.$width}px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-left: 1px solid var(--border-default);
  box-shadow: -16px 0 32px -16px rgba(18, 33, 28, 0.16);
  outline: none;
  animation: ${slideIn} var(--dur-drawer) var(--ease-drawer);

  @media (prefers-reduced-motion: reduce) {
    animation-name: ${fadeIn};
  }
`;

export const StyledDrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: var(--s4) 20px var(--s2);
`;

export const StyledDrawerTitle = styled.div`
  font: var(--fw-bold) var(--fs-lg) / 1.35 var(--font-serif);
  letter-spacing: -0.015em;
  text-wrap: balance;
`;

export const StyledDrawerBody = styled.div`
  flex: 1;
  overflow: auto;
  padding: 4px 20px 20px;
  font: var(--fw-regular) var(--fs-md) / 1.6 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledDrawerFooter = styled.div`
  display: flex;
  gap: var(--s2);
  justify-content: flex-end;
  padding: var(--s3) 20px;
  border-top: 1px solid var(--border-subtle);
`;
