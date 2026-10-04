import styled from "@emotion/styled";

export const StyledPagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s4);
  margin-top: var(--s4);
  font: var(--fw-regular) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
`;

export const StyledPaginationSummary = styled.span``;

export const StyledPaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--s1);
`;

// 현재 쪽 — 연한 면 + 초록 굵은 글자. 서버가 준 hasNext 만 믿으므로 이웃 쪽 번호는 만들지 않는다(§1.8).
export const StyledPaginationPage = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  padding: 0 var(--s2);
  border-radius: var(--radius-sm);
  background: var(--accent-primary-soft);
  color: var(--text-brand);
  font-weight: var(--fw-bold);
`;
