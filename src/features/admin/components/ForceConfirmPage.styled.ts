import styled from "@emotion/styled";

export const StyledForceConfirmLayout = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 var(--s5) var(--s5);
`;

export const StyledBandSlot = styled.div`
  margin-bottom: var(--s4);
`;

export const StyledChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--s4);
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledResultList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
  font-size: var(--fs-md);
`;

export const StyledBusCell = styled.span`
  b {
    font-weight: var(--fw-bold);
  }

  small {
    margin-left: 6px;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledTwoLine = styled.div`
  display: grid;
  gap: 2px;
  font-variant-numeric: tabular-nums;

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;
