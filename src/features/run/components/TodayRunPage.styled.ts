import styled from "@emotion/styled";

import { MAP_SURFACE_HEIGHT } from "@/features/map";

export const StyledTodayRunLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

// R15-T2 §8.23 목표 2 — 지도가 화면 상단에 가득차고, 그 우측에 버스 목록을 둔다
// (DashboardPage.styled.ts 와 같은 비율 — 지도 3 : 목록 1). 이 화면의 옛 상단
// 스위처(StyledBusSwitcher/Button)는 이 목록이 같은 역할(회차 선택)을 대신하며 대체됐다.
export const StyledMapTopRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;

  /* 1100px 이하에서는 오른쪽 목록이 좁아 회차 이름·상태 칩이 글자 단위로 꺾인다(B1 #13) — 지도 아래로 내려 쌓는다. */
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledMapPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const StyledFallbackNotice = styled.p`
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;

// R20-C 목표 5 — 근사 경로 안내를 지도 위로 올린다. 예전엔 지도 아래 작은 글자라
// 못 보고 "길이 아닌 곳을 지난다"로 오인했다(사용자 지적) — `StyledMapSurface`
// 안(`position: relative`)에 겹쳐서 항상 눈에 들어오게 한다.
export const StyledMapOverlayNotice = styled.p`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  margin: 0;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--surface-card);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-bold);
  color: var(--text-secondary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
`;

export const StyledBusListPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  overflow-y: auto;
  max-height: ${MAP_SURFACE_HEIGHT};
`;

// R20-C 목표 1 — 골라도 지도만 움직이고 카드는 그대로라 무엇을 눌렀는지 몰랐다
// (사용자 지적). 옅은 배경(--nav-active-bg)만으로는 대비가 약해, 굵은 테두리로
// 바꾼다. `aria-pressed`(호출부)와 짝을 이뤄 색만으로 구분하지 않는다.
export const StyledBusListItem = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: var(--radius-md);
  border: 2px solid ${(props) => (props.$active ? "var(--accent-primary)" : "transparent")};
  background: ${(props) => (props.$active ? "var(--accent-primary-soft)" : "transparent")};
  text-align: left;
  cursor: pointer;
`;

export const StyledBusListItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: var(--fw-bold);
  white-space: nowrap;
`;

// 명단 표를 전체 폭으로 쓴다(B1 #2·#13) — 옆 칸(2fr:1fr)에 두면 1440px 에서도 표가 750px 라 이름이 글자 단위로 줄바꿈되고
// 1024px 에서는 가로로 넘친다. 현재 위치·승하차지 카드는 표 위에 가로로 나란히 둔다.
export const StyledContentGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

export const StyledSidePanel = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  align-items: start;
`;

// F4 — 자리표시(점선 테두리)를 걷어내고 실제 `MapSurface` 를 담는 크기 지정 컨테이너로 바꾼다.
// R15-T2 — "화면 상단에 가득차게" 요구에 맞춰 160px → 480px 로 키운다(DashboardPage.styled.ts 와 동일).
export const StyledMapSurface = styled.div`
  position: relative;
  height: ${MAP_SURFACE_HEIGHT};
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;

export const StyledCrewRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-body-sm);
`;

export const StyledCrewLabel = styled.span`
  color: var(--text-secondary);
`;

// R24 — 지도에서 승하차지를 고르면 그 자리에서 타고 내리는 학생만 보여 준다(사용자 지시).
// 옆 패널이 좁아 표(`RosterTable`)를 그대로 쓰면 열이 눌린다 — 한 줄에 이름·학급·상태만 둔다.
export const StyledStopRosterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 6px 0;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-body-sm);
`;

export const StyledStopRosterName = styled.span`
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  min-width: 0;
`;

export const StyledStopRosterClass = styled.span`
  color: var(--text-secondary);
  font-size: var(--fs-caption);
`;

export const StyledStopRosterEmpty = styled.p`
  margin: 0;
  padding: 6px 0;
  color: var(--text-secondary);
  font-size: var(--fs-body-sm);
`;

// 고른 승하차지를 해제하는 단추 — 카드 제목 줄 오른쪽에 붙는다.
export const StyledStopRosterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
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
