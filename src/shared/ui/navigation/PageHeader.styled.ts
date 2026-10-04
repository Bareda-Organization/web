import styled from "@emotion/styled";

// 좌우 여백은 화면 레이아웃(padding 24px)이 이미 준다 — 여기서 또 주면 제목이 표·카드보다 안쪽에서 시작한다(B1 #30).
export const StyledPageHeader = styled.div`
  padding: 26px 0 0;
`;

export const StyledPageHeaderRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: var(--s4);
  flex-wrap: wrap;
`;

export const StyledPageHeaderBody = styled.div`
  flex: 1;
  min-width: 240px;
`;

export const StyledPageHeaderTitle = styled.h2`
  font: var(--fw-bold) var(--fs-page) / 1.25 var(--font-serif);
  text-wrap: balance;
  letter-spacing: -0.02em;
`;

export const StyledPageHeaderDescription = styled.div`
  margin-top: 6px;
  font: var(--fw-regular) var(--fs-md) / 1.6 var(--font-sans);
  color: var(--text-secondary);
  max-width: 78ch;
  text-wrap: pretty;
`;

export const StyledPageHeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

export const StyledPageHeaderTabs = styled.div`
  margin-top: 20px;
  border-bottom: 1px solid var(--border-subtle);
`;
