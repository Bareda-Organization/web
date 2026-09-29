import styled from "@emotion/styled";

// 화면 우측 상단에 떠 있는 비상 알림 묶음 — 어느 화면에서도 가려지지 않게 대화상자(z-index 40)보다 위에 둔다.
export const StyledEmergencyPopupStack = styled.div`
  position: fixed;
  top: 72px;
  right: 24px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 380px;
  max-width: calc(100vw - 48px);
`;
