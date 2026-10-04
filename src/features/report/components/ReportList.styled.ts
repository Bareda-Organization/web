import styled from "@emotion/styled";

export const StyledReportLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

export const StyledReportFilters = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

export const StyledReportNote = styled.small`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

// 옆 패널 안 — 이름 · 값 목록.
export const StyledReportKv = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s3);

  & > p {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--text-secondary);
  }
  h3 {
    margin: 0;
    font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
    color: var(--text-secondary);
  }
  dl {
    margin: 0;
  }
  dl > div {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-subtle);
    font-size: var(--fs-sm);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
    font-weight: var(--fw-medium);
  }
`;
