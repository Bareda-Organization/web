import styled from "@emotion/styled";

export const StyledBottomSheetRoot = styled.div`
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

export const StyledBottomSheetScrim = styled.div`
  position: absolute;
  inset: 0;
  background: var(--overlay-scrim);
`;

export const StyledBottomSheetPanel = styled.div`
  position: relative;
  background: var(--surface-card);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  box-shadow: var(--shadow-sheet);
  padding: 12px 20px 24px;
`;

export const StyledBottomSheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: var(--stone-200);
  margin: 0 auto 14px;
`;

export const StyledBottomSheetTitle = styled.div`
  font: var(--fw-bold) 20px / 1.35 var(--font-serif);
  letter-spacing: -0.015em;
  margin-bottom: 12px;
`;
