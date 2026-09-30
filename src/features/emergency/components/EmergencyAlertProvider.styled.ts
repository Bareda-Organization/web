import styled from "@emotion/styled";

// 머리줄 아래에 흐름으로 놓이는 비상 알림 띠 — 화면 위에 띄우면(fixed) 등록·배치 변경 버튼을 가린다(R46-WEB B1 #1).
export const StyledEmergencyPopupStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 24px 0;
`;
