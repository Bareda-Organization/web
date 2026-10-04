import styled from "@emotion/styled";

export const StyledMemberAccountsLayout = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 var(--s5) var(--s5);
`;

export const StyledAccountName = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr;
  column-gap: 10px;
  align-items: center;

  b {
    font-weight: var(--fw-bold);
  }

  small {
    grid-column: 2;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }

  span {
    grid-row: 1 / span 2;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-fill);
    font: var(--fw-medium) var(--fs-xs) / 1 var(--font-sans);
    color: var(--text-secondary);
  }
`;

export const StyledAcademyCell = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;

  a {
    text-decoration: none;
    border-bottom: 0;
  }
`;

export const StyledAcademyDot = styled.i<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

export const StyledLoginCell = styled.div`
  display: grid;
  gap: 2px;
  font-variant-numeric: tabular-nums;

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledFilterLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  color: var(--text-secondary);
`;

// 옆 패널 안의 동작 카드 — 이름 + 설명 + 오른쪽 단추
export const StyledActionCard = styled.div<{ $danger?: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--s3);
  padding: 14px;
  border-radius: var(--radius-control);
  box-shadow: inset 0 0 0 1px ${({ $danger }) => ($danger ? "var(--c-bad)" : "var(--border-default)")};

  b {
    display: block;
    font-weight: var(--fw-bold);
    font-size: var(--fs-md);
  }

  p {
    margin: 2px 0 0;
    font-size: var(--fs-xs);
    line-height: 1.5;
    color: var(--text-secondary);
  }
`;
