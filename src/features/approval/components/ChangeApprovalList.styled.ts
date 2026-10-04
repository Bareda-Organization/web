import styled from "@emotion/styled";

export const StyledChangeApprovalLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
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
