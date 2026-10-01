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
  /* 표를 스크롤 상자 안에 넣었을 때 머리줄이 따라 올라가지 않게 한다 — 스크롤하지 않는
     화면에서는 아무 효과가 없다. */
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 16px;
  font: var(--fw-medium) var(--fs-micro) / 1 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: var(--text-secondary);
  white-space: nowrap;
  width: ${(props) => (props.$width !== undefined ? props.$width : "auto")};
`;

export const StyledRosterTableRow = styled.tr<{ $clickable: boolean; $highlighted?: boolean }>`
  border-top: 1px solid var(--border-subtle);
  cursor: ${(props) => (props.$clickable ? "pointer" : undefined)};
  /* 방금 저장한 행 — 호출한 화면이 몇 초 뒤 키를 비우면 배경이 서서히 돌아온다. */
  background: ${(props) => (props.$highlighted ? "var(--accent-primary-soft)" : undefined)};
  transition: background-color 600ms ease;

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
`;

export const StyledRosterTableCell = styled.td<{ $align: "left" | "center" | "right" }>`
  text-align: ${(props) => props.$align};
  padding: 13px 16px;
  vertical-align: middle;
`;

/* 묶음(그룹) 머리줄 — 승하차지처럼 행을 나누는 기준 하나를 한 줄로 얹는다. */
export const StyledRosterGroupRow = styled.tr`
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-subtle);
`;

export const StyledRosterGroupCell = styled.td`
  padding: 0;
`;

export const StyledRosterGroupButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: 0;
  background: none;
  cursor: pointer;
  text-align: left;
  font: var(--fw-medium) var(--fs-body-sm) / 1.4 var(--font-sans);
  color: var(--text-primary);

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
`;

export const StyledRosterGroupCount = styled.span`
  color: var(--text-secondary);
  font: var(--fw-regular) var(--fs-micro) / 1 var(--font-sans);
`;

/* 빈 상태·조회 실패 문구 아래의 행동 버튼 한 줄. */
export const StyledRosterEmptyAction = styled.div`
  margin-top: 12px;
`;
