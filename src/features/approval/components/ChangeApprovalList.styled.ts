import styled from "@emotion/styled";

export const StyledChangeApprovalLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

export const StyledSubText = styled.small`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledGroupHead = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 10px;

  span {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledChangeFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: 0 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;
