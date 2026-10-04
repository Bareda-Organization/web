import styled from "@emotion/styled";

export const StyledStudentLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledStudentToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const StyledSubText = styled.small`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledStudentFooter = styled.div`
  padding: 0 20px;
  border-top: 1px solid var(--border-subtle);
`;

// 퇴원 확인 창의 영향 표 — 오늘 · 내일부터 · 지난 기록.
export const StyledPreviewList = styled.dl`
  margin: 12px 0 0;
  font-size: var(--fs-sm);

  & > div {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
  }
`;
