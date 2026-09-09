import styled from "@emotion/styled";

export const StyledStudentRow = styled.div<{ $selected: boolean; $clickable: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 16px;
  background: ${(props) => (props.$selected ? "var(--bg-subtle)" : "var(--surface-card)")};
  border-bottom: 1px solid var(--border-subtle);
  cursor: ${(props) => (props.$clickable ? "pointer" : undefined)};
  transition: var(--transition-control);
`;

export const StyledStudentRowAvatar = styled.span`
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-brand);
  display: grid;
  place-items: center;
  font: var(--fw-bold) 14px / 1 var(--font-sans);
`;

export const StyledStudentRowBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledStudentRowName = styled.div`
  font: var(--fw-medium) var(--fs-body-sm) / 1.4 var(--font-sans);
`;

export const StyledStudentRowMeta = styled.div`
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: var(--text-secondary);
`;

export const StyledStudentRowCall = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  color: var(--text-secondary);
  display: grid;
  place-items: center;
  cursor: pointer;
`;
