import styled from "@emotion/styled";

export const StyledAcademiesLayout = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 var(--s5) var(--s5);
`;

export const StyledAcademyName = styled.div`
  display: grid;
  grid-template-columns: 8px 1fr;
  column-gap: 8px;
  align-items: baseline;

  b {
    font-weight: var(--fw-bold);
    font-size: var(--fs-md);
    overflow-wrap: anywhere;
  }

  small {
    grid-column: 2;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledAcademyDot = styled.i<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

export const StyledCodeChip = styled.code`
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--surface-fill);
  font: var(--fw-regular) var(--fs-xs) / 1.4 var(--font-mono);
`;

export const StyledStaffCount = styled.span`
  font-variant-numeric: tabular-nums;

  small {
    color: var(--text-secondary);
    font-size: inherit;
  }
`;

export const StyledStatusCell = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  a {
    text-decoration: none;
    border-bottom: 0;
  }
`;

export const StyledCardBars = styled.div`
  display: flex;
  gap: 4px;
  height: 8px;
  margin-top: 10px;

  i {
    display: block;
    height: 100%;
    border-radius: 4px;
    min-width: 3px;
  }
`;
