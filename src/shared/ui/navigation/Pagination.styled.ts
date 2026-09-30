import styled from "@emotion/styled";

export const StyledPagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
`;

export const StyledPaginationSummary = styled.span`
  font: var(--fw-light) var(--fs-caption) / 1.6 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledPaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const StyledPaginationPage = styled.span`
  font: var(--fw-bold) var(--fs-body) / 1 var(--font-sans);
  color: var(--text-primary);
  min-width: 64px;
  text-align: center;
`;
