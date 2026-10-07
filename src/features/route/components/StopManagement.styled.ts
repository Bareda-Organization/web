import styled from "@emotion/styled";

import { MAP_SURFACE_HEIGHT } from "@/features/map";

export const StyledStopLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 */
  padding: 0 24px 24px;
`;

export const StyledStopGuide = styled.p`
  margin: -8px 0 0;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledRouteTags = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
`;

// 비활성 편성은 흐리게 — 이력으로만 남은 편성이라 지금 이 승하차지를 쓰는 편성과 구별한다.
export const StyledRouteTag = styled.span`
  padding: 2px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-card);
  color: var(--text-primary);
  font: var(--fw-regular) var(--fs-micro) / 1.5 var(--font-sans);
  white-space: nowrap;

  &[data-active="false"] {
    color: var(--text-tertiary);
    background: transparent;
    opacity: 0.6;
  }
`;

export const StyledMuted = styled.span`
  color: var(--text-tertiary);
`;

// 수정 대화상자 — 왼쪽 양식, 오른쪽 지도(핀을 끌어 자리를 옮긴다). 좁은 화면에서는 위아래로 쌓는다.
export const StyledEditBody = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledPinMap = styled.div`
  height: ${MAP_SURFACE_HEIGHT};
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;
