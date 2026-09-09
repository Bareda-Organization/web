import styled from "@emotion/styled";

export const StyledDelayPicker = styled.div``;

export const StyledDelayPickerLabel = styled.div`
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
  color: var(--text-secondary);
  margin-bottom: 10px;
`;

export const StyledDelayPickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

export const StyledDelayPickerOption = styled.button<{ $active: boolean }>`
  height: 52px;
  border-radius: var(--radius-control);
  cursor: pointer;
  background: ${(props) => (props.$active ? "var(--status-moving-soft)" : "var(--surface-card)")};
  border: 1px solid ${(props) => (props.$active ? "var(--status-moving)" : "var(--border-default)")};
  color: ${(props) => (props.$active ? "var(--status-moving)" : "var(--text-primary)")};
  font: var(--fw-bold) var(--fs-body) / 1 var(--font-sans);
  transition: var(--transition-control);
`;
