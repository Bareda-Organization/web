import styled from "@emotion/styled";

import { MAP_SURFACE_HEIGHT } from "@/features/map";

export const StyledMonitoringLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledFilterRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: 320px;
`;

// R15-T2 docs/archive/rounds/be-rounds-r15-r21.md §8.23 목표 2 — 지도가 화면 상단에 가득차고, 그 우측에 버스 목록을 둔다
// (run/components/DashboardPage.styled.ts 와 같은 비율 — 지도 3 : 목록 1).
export const StyledMapTopRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;

  /* 1100px 이하에서는 오른쪽 목록이 좁아 "1호차 · 등원" 이 두 줄로 꺾인다(화면 확인 1024) — 대시보드와 같이 지도 아래로 내려 쌓는다. */
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

export const StyledBusListEmpty = styled.p`
  color: var(--text-secondary);
  font-size: var(--fs-body-sm);
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
  font-weight: var(--fw-bold);
`;

// F4 — 자리표시(점선 테두리)를 걷어내고 실제 `MapSurface` 를 담는 크기 지정 컨테이너로
// 바꾼다. `overflow: hidden` 은 지도 SDK 가 만드는 내부 타일 레이어가 둥근 모서리를
// 넘치지 않게 한다. R15-T2 — "화면 상단에 가득차게" 요구에 맞춰 220px → 480px.
export const StyledMapSurface = styled.div`
  position: relative;
  height: ${MAP_SURFACE_HEIGHT};
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;

/* 명단이 길면 대화상자가 화면보다 길어져 닫기 버튼이 밀려난다(실측 1,422px · 화면 720px) — 이 상자 안에서 스크롤한다.
   높이는 고정 px 가 아니라 화면에 맞춘다(TodayRunPage 의 StyledRosterScroll 과 같은 값). */
export const StyledRosterDialogScroll = styled.div`
  max-height: min(60vh, 720px);
  overflow-y: auto;
`;

export const StyledRosterStopBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--border-subtle);

  &:first-of-type {
    border-top: none;
  }
`;

export const StyledRosterStopTitle = styled.p`
  font-weight: var(--fw-bold);
`;

export const StyledRosterStudentRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
