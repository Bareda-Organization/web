import styled from "@emotion/styled";

// 좌우 여백은 화면 레이아웃(padding 24px)이 이미 준다 — 여기서 또 주면 제목이 표·카드보다 안쪽에서 시작한다(B1 #30).
export const StyledPageHeader = styled.div`
  padding: 26px 0 0;
`;

export const StyledPageHeaderRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
`;

export const StyledPageHeaderBody = styled.div`
  flex: 1;
  min-width: 240px;
`;

export const StyledPageHeaderTitle = styled.h2`
  font: var(--fw-bold) 30px / 1.25 var(--font-serif);
  letter-spacing: -0.02em;
`;

export const StyledPageHeaderDescription = styled.div`
  margin-top: 6px;
  font: var(--fw-light) var(--fs-caption) / 1.6 var(--font-sans);
  letter-spacing: var(--ls-caption);
  color: var(--text-secondary);
`;

export const StyledPageHeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

export const StyledPageHeaderTabs = styled.div`
  margin-top: 20px;
  border-bottom: 1px solid var(--border-subtle);
`;
