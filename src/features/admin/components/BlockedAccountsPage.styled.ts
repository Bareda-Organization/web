import styled from "@emotion/styled";

export const StyledBlockedAccountsLayout = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 var(--s5) var(--s5);
`;

export const StyledNoticeSlot = styled.div`
  margin-bottom: var(--s4);
`;

export const StyledBlockedName = styled.div`
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

export const StyledAcademyDot = styled.i<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

export const StyledTimeCell = styled.div`
  display: grid;
  gap: 2px;
  font-variant-numeric: tabular-nums;

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;
