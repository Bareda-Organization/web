import styled from "@emotion/styled";

export const StyledFieldset = styled.fieldset`
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
`;

export const StyledLegend = styled.legend`
  padding: 0;
  margin-bottom: 6px;
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledWeekdayRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  column-gap: 14px;
`;

export const StyledFailureList = styled.ul`
  margin: 0;
  padding-left: 18px;
`;
