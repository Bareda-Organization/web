import styled from "@emotion/styled";

export const StyledRosterTable = styled.div`
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
`;

export const StyledRosterTableElement = styled.table`
  width: 100%;
  border-collapse: collapse;
  font: var(--fw-regular) var(--fs-body-sm) / 1.5 var(--font-sans);
`;

export const StyledRosterTableHeadRow = styled.tr`
  background: var(--bg-subtle);
`;

export const StyledRosterTableHeadCell = styled.th<{ $align: "left" | "center" | "right"; $width?: number | string }>`
  text-align: ${(props) => props.$align};
  padding: 12px 16px;
  font: var(--fw-medium) var(--fs-micro) / 1 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: var(--text-secondary);
  white-space: nowrap;
  width: ${(props) => (props.$width !== undefined ? props.$width : "auto")};
`;

export const StyledRosterTableRow = styled.tr<{ $clickable: boolean }>`
  border-top: 1px solid var(--border-subtle);
  cursor: ${(props) => (props.$clickable ? "pointer" : undefined)};
`;

export const StyledRosterTableCell = styled.td<{ $align: "left" | "center" | "right" }>`
  text-align: ${(props) => props.$align};
  padding: 13px 16px;
  vertical-align: middle;
`;
