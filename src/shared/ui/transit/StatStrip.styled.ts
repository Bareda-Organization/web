import styled from "@emotion/styled";

type ValueTone = "neutral" | "warn" | "bad" | "zero";

const VALUE_COLOR: Record<ValueTone, string> = {
  neutral: "var(--text-primary)",
  warn: "var(--t-move)",
  bad: "var(--t-bad)",
  zero: "var(--text-secondary)",
};

export const StyledStatStrip = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, 1fr);
  margin-bottom: var(--s4);
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
`;

export const StyledStatCell = styled.div`
  padding: var(--s4) 20px;
  border-left: 1px solid var(--border-subtle);

  &:first-of-type {
    border-left: 0;
  }

  svg {
    display: block;
    margin-top: 6px;
  }
`;

export const StyledStatLabel = styled.div`
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  letter-spacing: 0.02em;
  color: var(--text-secondary);
`;

export const StyledStatValue = styled.div<{ $tone: ValueTone }>`
  margin: 6px 0 4px;
  font: var(--fw-bold) var(--fs-num) / 1.1 var(--font-sans);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ $tone }) => VALUE_COLOR[$tone]};

  small {
    margin-left: 3px;
    font: var(--fw-regular) var(--fs-sm) / 1 var(--font-sans);
    letter-spacing: 0;
    color: var(--text-secondary);
  }
`;

export const StyledStatDetail = styled.div`
  min-height: 34px;
  font-size: var(--fs-xs);
  line-height: 1.45;
  color: var(--text-secondary);
  text-wrap: pretty;
`;
