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

// 쪽 넘김 버튼 — 꺼졌을 때 점선 테두리 대신 흐리게만 한다(시안 kit 7절 .pgb). 일반 버튼의 점선 꺼짐은 이유 글을 읽히게 하려는 것이라 여기서는 쓰지 않는다.
export const StyledPageButton = styled.button`
  display: inline-grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  padding: 0 var(--s2);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color var(--dur-ui) var(--ease-out),
    transform var(--dur-press) var(--ease-out);

  &:active:not(:disabled) {
    transform: scale(0.94);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: var(--bg-base);
      color: var(--text-primary);
    }
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;
