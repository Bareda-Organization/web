import styled from "@emotion/styled";

export const StyledPageHeader = styled.div`
  padding: 26px var(--gutter-desktop) 0;
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
