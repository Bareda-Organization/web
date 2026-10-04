import styled from "@emotion/styled";

export const StyledNotificationLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
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

export const StyledRecipientCell = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;

  small {
    color: var(--text-secondary);
    font-size: var(--fs-xs);
  }
`;

export const StyledNotificationFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: 0 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;
