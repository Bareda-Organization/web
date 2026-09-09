import styled from "@emotion/styled";

export const StyledEmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
`;

export const StyledEmptyStateIcon = styled.span`
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-brand);
`;

export const StyledEmptyStateTitle = styled.div`
  margin-top: 16px;
  font: var(--fw-bold) 20px / 1.4 var(--font-serif);
  letter-spacing: -0.015em;
`;

export const StyledEmptyStateBody = styled.div`
  margin-top: 8px;
  font: var(--fw-light) var(--fs-caption) / 1.7 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledEmptyStateAction = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: center;
`;
