import styled from "@emotion/styled";

import { MAP_SURFACE_HEIGHT_PX } from "@/features/map/mapSurfaceSize";

// 목록 칸의 폭 — 이름·배지·버튼 네 개가 한 줄에 들어가는 만큼만(지시 1: 가로로 길 필요 없다).
const LIST_COLUMN_WIDTH_PX = 380;

/* 2026-09-23 사용자 지시 1 — 목록은 왼쪽 고정 폭 칸, 지도는 나머지. 좁은 화면에서는 위아래로 쌓는다. */
export const StyledEditor = styled.div`
  display: grid;
  grid-template-columns: ${LIST_COLUMN_WIDTH_PX}px minmax(0, 1fr);
  align-items: start;
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledListColumn = styled.section`
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
`;

export const StyledMapColumn = styled.div`
  position: sticky;
  top: 24px;
  min-width: 0;
`;

export const StyledListHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
`;

export const StyledListTitle = styled.h2`
  margin: 0;
  white-space: nowrap;
  font: var(--fw-medium) var(--fs-body) / 1.2 var(--font-sans);
  color: var(--text-secondary);

  & > strong {
    font-weight: var(--fw-bold);
    color: var(--text-primary);
  }
`;

export const StyledListHeaderActions = styled.div`
  display: flex;
  gap: 4px;

  & > button {
    white-space: nowrap;
  }
`;

/* 지도와 같은 높이 안에서만 늘어나고 넘치면 이 칸 안에서 스크롤한다 — 페이지 전체가 길어지지 않게. */
export const StyledStopList = styled.ol`
  margin: 0;
  padding: 8px;
  list-style: none;
  max-height: ${MAP_SURFACE_HEIGHT_PX - 120}px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const StyledStopRow = styled.li<{ $dragging?: boolean; $selected?: boolean }>`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 8px;
  border-radius: var(--radius-md);
  background: ${({ $selected }) => ($selected ? "var(--green-50)" : "transparent")};
  box-shadow: ${({ $selected }) => ($selected ? "inset 0 0 0 1px var(--green-300)" : "none")};
  cursor: grab;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};

  &:hover {
    background: ${({ $selected }) => ($selected ? "var(--green-50)" : "var(--surface-mist)")};
  }
`;

/* 지도의 핀과 같은 초록 원 — 목록 번호와 핀 번호를 눈으로 잇는다. */
export const StyledStopSeq = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  font: var(--fw-bold) var(--fs-micro) / 1 var(--font-sans);
`;

export const StyledStopMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  min-width: 0;
`;

/* 긴 이름이 한 줄을 밀어내지 않게 — 넘치면 줄바꿈한다(잘라내면 어느 자리인지 못 읽는다). */
export const StyledStopName = styled.span`
  font: var(--fw-medium) var(--fs-body-sm) / 1.35 var(--font-sans);
  color: var(--text-primary);
  overflow-wrap: anywhere;
`;

export const StyledStopActions = styled.div`
  display: flex;
`;

/* 저장 줄 — 목록 칸 맨 아래에 늘 있다. 변경이 있으면 색으로 알린다(지시 7). */
export const StyledSaveBar = styled.footer<{ $dirty: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
  background: ${({ $dirty }) => ($dirty ? "var(--amber-100)" : "var(--surface-card)")};
`;

export const StyledSaveStatus = styled.span`
  flex: 1;
  font: var(--fw-medium) var(--fs-micro) / 1.4 var(--font-sans);
  color: var(--text-secondary);
`;
