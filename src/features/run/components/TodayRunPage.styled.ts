import styled from "@emotion/styled";
import { MAP_SURFACE_HEIGHT } from "@/features/map";

export const StyledTodayRunLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

// 오늘 회차 카드 줄 — 6개가 한 줄에 놓이고 많으면 옆으로 스크롤한다.
export const StyledRunStrip = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(168px, 1fr);
  gap: 10px;
  overflow-x: auto;
  padding: 2px;
`;

export const StyledRunCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border: 0;
  border-radius: var(--radius-card);
  background: var(--surface-card);
  box-shadow: ${({ $selected }) => ($selected ? "inset 0 0 0 2px var(--selected-edge), var(--shadow-card)" : "var(--shadow-card)")};
  text-align: left;
  cursor: pointer;
`;

export const StyledRunCardRow = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  font-size: var(--fs-xs);
  color: var(--text-secondary);

  strong {
    font: var(--fw-bold) var(--fs-lg) / 1.2 var(--font-sans);
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }
`;

export const StyledRunCardTrack = styled.span`
  display: block;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--border-subtle);
  overflow: hidden;

  & > span {
    display: block;
    height: 100%;
    background: var(--c-conf);
  }
`;

export const StyledRunCardNote = styled.span`
  &[data-tone="warn"] {
    color: var(--t-move);
    font-weight: var(--fw-bold);
  }
  &[data-tone="bad"] {
    color: var(--t-bad);
    font-weight: var(--fw-bold);
  }
`;

// 지도(넓게) + 회차 정보 카드.
export const StyledMapInfoRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: var(--s4);
  align-items: stretch;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledMapCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);

  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  h2 {
    margin: 0;
    font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
  }
  header p {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

// 지도는 위치 확인용 — 높이는 모든 지도와 같은 `MAP_SURFACE_HEIGHT`(2026-10-06 사용자 지시 · 화면의 50%).
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

// 지도 위 이름표 — 현재 → 다음 정차지, 근사·예정 경로 안내(Ruling 309 · 321).
export const StyledMapChips = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;

  p {
    margin: 0;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    background: var(--surface-card);
    font-size: var(--fs-sm);
    font-weight: var(--fw-bold);
    color: var(--text-primary);
    box-shadow: var(--shadow-card);
  }
  p[data-kind="notice"] {
    color: var(--text-secondary);
  }
`;

export const StyledInfoCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  padding: 16px 20px;
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
`;

export const StyledInfoCardHead = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const StyledInfoCardTitle = styled.h2`
  margin: 0;
  font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
`;

// 정의 목록(출발 · 도착 …) — 왼쪽 이름, 오른쪽 값.
export const StyledInfoList = styled.dl`
  display: flex;
  flex-direction: column;
  margin: 0;
  font-size: var(--fs-sm);

  & > div {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-weight: var(--fw-medium);
    font-variant-numeric: tabular-nums;
  }
`;

export const StyledInfoCardSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  h3 {
    margin: 0;
    font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
    color: var(--text-secondary);
  }
`;

export const StyledInfoNote = styled.p`
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledCrewItem = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);

  & > i {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--surface-fill);
    font-style: normal;
    font-weight: var(--fw-bold);
    color: var(--text-secondary);
  }
  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledPhoneRow = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;

  a {
    color: var(--text-primary);
    text-decoration: underline;
  }
`;

// 전화 걸기 — 작은 보조 단추 모양의 링크.
export const StyledPhoneLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-card);
  font: var(--fw-medium) var(--fs-sm) / 1 var(--font-sans);
  color: var(--text-primary);
  white-space: nowrap;
  text-decoration: none;

  &:hover {
    background: var(--green-50);
  }
`;

// 명단 카드 — 머리(제목 · 검색) / 필터 줄 / 표 / 안내 글.
export const StyledRosterCard = styled.section`
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
`;

export const StyledRosterCardHead = styled.header`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 16px 20px 8px;

  h2 {
    margin: 0;
    font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
  }
  p {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
  form {
    margin-left: auto;
    min-width: 260px;
  }
`;

export const StyledRosterFootnote = styled.p`
  margin: 0;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledGroupLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;

  & > i {
    min-width: 18px;
    font-style: normal;
    font-weight: var(--fw-bold);
    color: var(--text-secondary);
  }
  & > small {
    color: var(--text-secondary);
  }
`;

/* 명단이 화면을 넘어가면 이 상자 안에서 스크롤한다(사용자 지시 2026-09-22).
   높이를 화면에 맞춰 잡아 두는 이유 — 고정 px 로 두면 큰 화면에서 표가 늘 잘린다. */
export const StyledRosterScroll = styled.div`
  max-height: min(60vh, 720px);
  overflow: auto;

  /* 이름·반·상태 칩이 글자 단위로 꺾이지 않게 한다 — 폭이 모자라면 줄이 아니라 이 상자가 가로로 스크롤한다. */
  th,
  td {
    white-space: nowrap;
  }
`;

// R24 — 지도에서 승하차지를 고르면 그 자리에서 타고 내리는 학생만 보여 준다(사용자 지시). 한 줄에 이름·학급·상태만 둔다.
export const StyledStopRosterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s2);
  padding: 6px 0;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-sm);
`;

export const StyledStopRosterName = styled.span`
  display: flex;
  align-items: baseline;
  gap: var(--s2);
  min-width: 0;
`;

export const StyledStopRosterClass = styled.span`
  color: var(--text-secondary);
  font-size: var(--fs-xs);
`;

export const StyledStopRosterEmpty = styled.p`
  margin: 0;
  padding: 6px 0;
  color: var(--text-secondary);
  font-size: var(--fs-sm);
`;

// 고른 승하차지를 해제하는 단추 — 카드 제목 줄 오른쪽에 붙는다.
export const StyledStopRosterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s2);

  h3 {
    margin: 0;
    font: var(--fw-bold) var(--fs-sm) / 1.4 var(--font-sans);
  }
`;

export const StyledCrewLabel = styled.span`
  color: var(--text-secondary);
  font-size: var(--fs-sm);
`;
