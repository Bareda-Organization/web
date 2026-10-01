import styled from "@emotion/styled";

export const StyledNotificationLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledNotificationFilters = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

/* 수신자 이름 옆의 "관계자 알림" 표시 — 이름과 한 칸 띄운다. */
export const StyledStaffRecipientMark = styled.span`
  margin-left: 8px;
`;
