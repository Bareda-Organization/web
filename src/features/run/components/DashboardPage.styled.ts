import styled from "@emotion/styled";
import { MAP_SURFACE_HEIGHT } from "@/features/map";

export const StyledDashboardLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

// 연결 상태 한 줄 — 머리 오른쪽. 점 + 글자(색만으로 말하지 않는다).
export const StyledLiveStatus = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--text-secondary);

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--c-conf);
  }
`;

// 위 두 칸(표 · 처리할 것) / 아래 두 칸(지도 · 학생 현황) 공통 — 왼쪽이 오른쪽의 두 배.
export const StyledBoardRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--s4);
  align-items: stretch;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledBoardCard = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
`;

export const StyledBoardCardHead = styled.header`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 16px 20px 12px;

  h2 {
    margin: 0;
    font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
  }

  p {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledBoardCardTools = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--s3);
`;

export const StyledBoardCardBody = styled.div`
  flex: 1;
  padding: 0 20px 16px;
`;

// 오늘 운행 구성 막대(종료 · 운행 중 · 확정 · 운행 전) — 지표 칸 안에 들어간다.
export const StyledSegmentBar = styled.span`
  display: flex;
  gap: 3px;
  margin-top: 10px;

  & > span {
    height: 8px;
    border-radius: 4px;
  }
`;

// 학생 4분류 누적 막대 — 탑승 · 미승차 · 미등원(빗금) · 대기.
export const StyledRiderBar = styled.span<{ $thin?: boolean }>`
  display: flex;
  height: ${({ $thin }) => ($thin ? "10px" : "14px")};
  border-radius: 7px;
  overflow: hidden;
  background: var(--border-subtle);

  & > span {
    display: block;
    height: 100%;
  }

  & > span[data-kind="boarded"] {
    background: var(--c-conf);
  }
  & > span[data-kind="noShow"] {
    background: var(--c-bad);
  }
  & > span[data-kind="absent"] {
    background: repeating-linear-gradient(135deg, var(--c-end) 0 2px, var(--surface-card) 2px 4px);
  }
`;

export const StyledRiderLegend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-xs);
  color: var(--text-secondary);

  li::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 5px;
    background: var(--c-wait);
    border-radius: 50%;
  }
  li[data-kind="boarded"]::before {
    background: var(--c-conf);
  }
  li[data-kind="noShow"]::before {
    background: var(--c-bad);
    border-radius: 0;
    transform: rotate(45deg) scale(0.85);
  }
  li[data-kind="absent"]::before {
    background: var(--c-end);
    border-radius: 1px;
  }
  li[data-kind="waiting"]::before {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--c-wait);
  }
`;

export const StyledRunRiderBlock = styled.div`
  padding: 14px 0 12px;
  border-top: 1px solid var(--border-subtle);

  header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }

  header strong {
    font: var(--fw-bold) var(--fs-sm) / 1.4 var(--font-sans);
    color: var(--text-primary);
  }
`;

// 상태 칩 + 그 아래 한 줄 사유.
export const StyledStatusCell = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
  small[data-tone="warn"] {
    color: var(--t-move);
    font-weight: var(--fw-bold);
  }
  small[data-tone="bad"] {
    color: var(--t-bad);
    font-weight: var(--fw-bold);
  }
`;

export const StyledStaffCell = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  white-space: nowrap;

  & > span {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  & > span > b {
    max-width: 9em;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: var(--fw-regular);
  }
  & > span > small {
    color: var(--text-secondary);
    font-size: var(--fs-xs);
  }
`;

export const StyledDepartCell = styled.span`
  font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
  font-variant-numeric: tabular-nums;
`;

export const StyledChangeNote = styled.small`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledActionList = styled.div`
  padding: 0 20px 16px;
`;

export const StyledCountPill = styled.span`
  margin-left: auto;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--row-bad-bg);
  font: var(--fw-bold) var(--fs-xs) / 1.5 var(--font-sans);
  color: var(--t-bad);
`;

export const StyledMapTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const StyledMapTab = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border: 1px solid ${({ $active }) => ($active ? "var(--selected-edge)" : "var(--border-default)")};
  border-radius: var(--radius-pill);
  background: ${({ $active }) => ($active ? "var(--selected-bg)" : "var(--surface-card)")};
  font: ${({ $active }) => ($active ? "var(--fw-bold)" : "var(--fw-regular)")} var(--fs-xs) / 1.5 var(--font-sans);
  color: ${({ $active }) => ($active ? "var(--t-conf, var(--accent-primary))" : "var(--text-secondary)")};
  cursor: pointer;
`;

export const StyledMapPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 20px 16px;
`;

// 지도는 위치 확인용이다(판단은 위 표·처리 목록) — 높이는 모든 지도와 같은 `MAP_SURFACE_HEIGHT`(2026-10-06 사용자 지시 · 화면의 50%).
export const StyledMapSurface = styled.div`
  position: relative;
  height: ${MAP_SURFACE_HEIGHT};
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--surface-fill);
`;

export const StyledFallbackNotice = styled.p`
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

// 근사·예정 경로 안내를 지도 위로 올린다(Ruling 309) — 지도 밖 작은 글자는 "길이 아닌 곳을 지난다" 로 오인됐다.
export const StyledMapOverlayNotice = styled.p`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  margin: 0;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--surface-card);
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--text-secondary);
  box-shadow: var(--shadow-card);
`;

// 운행 중 회차마다 한 줄 — 현재 → 다음 정차지.
export const StyledLiveLines = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-sm);

  li {
    display: flex;
    gap: 10px;
  }
  li > span {
    color: var(--text-secondary);
  }
`;
