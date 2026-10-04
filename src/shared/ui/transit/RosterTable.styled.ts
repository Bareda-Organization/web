import styled from "@emotion/styled";
import { css } from "@emotion/react";

export type RosterRowTone = "warn" | "bad";

export const StyledRosterTable = styled.div`
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
`;

// 촘촘한 표 — 행 높이 약 40px · 숫자는 자리 맞춤(tabular-nums). 머리줄은 면 없이 아래 선만.
export const StyledRosterTableElement = styled.table`
  width: 100%;
  border-collapse: collapse;
  font: var(--fw-regular) var(--fs-sm) / 1.5 var(--font-sans);
  font-variant-numeric: tabular-nums;
`;

export const StyledRosterTableHeadRow = styled.tr``;

export const StyledRosterTableHeadCell = styled.th<{ $align: "left" | "center" | "right"; $width?: number | string }>`
  text-align: ${(props) => props.$align};
  /* 표를 스크롤 상자 안에 넣었을 때 머리줄이 따라 올라가지 않게 한다 — 스크롤하지 않는
     화면에서는 아무 효과가 없다. */
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px 12px 8px;
  background: var(--surface-card);
  border-bottom: 1px solid var(--border-default);
  font: var(--fw-medium) var(--fs-xs) / 1.4 var(--font-sans);
  color: var(--text-secondary);
  white-space: nowrap;
  width: ${(props) => (props.$width !== undefined ? props.$width : "auto")};
`;

const toneRow: Record<RosterRowTone, ReturnType<typeof css>> = {
  warn: css`
    & > td {
      background: var(--row-warn-bg);
    }
    & > td:first-of-type::before {
      background: var(--c-move);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
    }
  `,
  bad: css`
    & > td {
      background: var(--row-bad-bg);
    }
    & > td:first-of-type::before {
      background: var(--c-bad);
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    }
  `,
};

export const StyledRosterTableRow = styled.tr<{ $clickable: boolean; $highlighted?: boolean; $selected?: boolean; $tone?: RosterRowTone }>`
  cursor: ${(props) => (props.$clickable ? "pointer" : undefined)};
  /* 방금 저장한 행 — 호출한 화면이 몇 초 뒤 키를 비우면 배경이 서서히 돌아온다. */
  background: ${(props) => (props.$highlighted ? "var(--accent-primary-soft)" : undefined)};
  transition: background-color 600ms ease;

  & > td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  &:last-of-type > td {
    border-bottom: 0;
  }

  /* 주의·위험 행은 왼쪽 색 막대 대신 연한 면 + 첫 칸 앞의 모양(▲ 주의 · ◆ 위험)으로 말한다 */
  ${({ $tone }) =>
    $tone
      ? css`
          ${toneRow[$tone]}
          & > td:first-of-type {
            position: relative;
            padding-left: 30px;
          }
          & > td:first-of-type::before {
            content: "";
            position: absolute;
            left: 12px;
            top: 50%;
            width: 10px;
            height: 10px;
            margin-top: -5px;
          }
        `
      : null}

  /* 선택 행은 연한 면 + 위아래 둘레선(왼쪽 막대 없음, Ruling 828 D2) */
  ${({ $selected }) =>
    $selected
      ? css`
          & > td {
            background: var(--selected-bg);
            box-shadow:
              inset 0 1px 0 var(--selected-edge),
              inset 0 -1px 0 var(--selected-edge);
          }
        `
      : null}

  @media (hover: hover) and (pointer: fine) {
    &:hover > td {
      ${({ $clickable, $selected, $tone }) => ($clickable && !$selected && !$tone ? "background: var(--bg-base);" : "")}
    }
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
`;

export const StyledRosterTableCell = styled.td<{ $align: "left" | "center" | "right" }>`
  text-align: ${(props) => props.$align};
  vertical-align: middle;
  overflow-wrap: break-word;
`;

/* 묶음(그룹) 머리줄 — 승하차지처럼 행을 나누는 기준 하나를 한 줄로 얹는다. */
export const StyledRosterGroupRow = styled.tr`
  & > td {
    background: var(--bg-base);
    border-bottom: 1px solid var(--border-default);
  }
`;

export const StyledRosterGroupCell = styled.td`
  padding: 0;
`;

export const StyledRosterGroupButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: none;
  cursor: pointer;
  text-align: left;
  font: var(--fw-bold) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--text-primary);

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
`;

export const StyledRosterGroupCount = styled.span`
  color: var(--text-secondary);
  font: var(--fw-regular) var(--fs-xs) / 1 var(--font-sans);
`;

/* 빈 상태·조회 실패 문구 아래의 행동 버튼 한 줄. */
export const StyledRosterEmptyAction = styled.div`
  margin-top: 12px;
`;
