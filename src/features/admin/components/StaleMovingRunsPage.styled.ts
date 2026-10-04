import styled from "@emotion/styled";

export const StyledCardHeading = styled.h2`
  margin: 0;
  padding: var(--s4) var(--s4) var(--s2);
  font: var(--fw-bold) var(--fs-lg) / 1.4 var(--font-sans);
`;

export const StyledAcademyName = styled.div`
  display: grid;
  grid-template-columns: 8px 1fr;
  column-gap: 8px;
  align-items: baseline;

  b {
    font-weight: var(--fw-bold);
  }

  small {
    grid-column: 2;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
`;

export const StyledAcademyDot = styled.i<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

export const StyledActionPair = styled.div`
  display: inline-flex;
  justify-content: flex-end;
  gap: var(--s2);
`;
