import styled from "@emotion/styled";

export const StyledSignupApprovalLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

// 왼쪽 목록 · 오른쪽 처리 패널 — 승인은 "연결할 레코드를 맞게 고르는 일"이라 신청 정보와 후보를 나란히 본다.
export const StyledSignupBoard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(340px, 1fr);
  gap: var(--s4);
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledSignupFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: 0 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledWaitedNote = styled.small`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledPanel = styled.section`
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  padding: 20px;
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
`;

export const StyledPanelHead = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;

  h2 {
    margin: 0;
    font: var(--fw-bold) var(--fs-lg) / 1.3 var(--font-sans);
  }
`;

export const StyledPanelList = styled.dl`
  margin: 0;
  font-size: var(--fs-sm);

  & > div {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
    font-weight: var(--fw-medium);
  }
  dd small {
    margin-left: 4px;
    font-weight: var(--fw-regular);
    color: var(--text-secondary);
  }
`;

export const StyledPanelSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  h3 {
    margin: 0;
    font: var(--fw-bold) var(--fs-sm) / 1.4 var(--font-sans);
  }
  p {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--text-secondary);
  }
`;

export const StyledPanelActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export const StyledDialogForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
