import styled from "@emotion/styled";

import { MAP_SURFACE_HEIGHT } from "@/features/map";

export const StyledDetailLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
`;

export const StyledRouteGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 8px;
`;

export const StyledRouteColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const StyledRouteStopRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--fs-body-sm);
`;

export const StyledInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--fs-body-sm);

  &:last-of-type {
    border-bottom: none;
  }
`;

export const StyledInfoLabel = styled.span`
  color: var(--text-secondary);
`;

export const StyledActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
`;

// `R18-C` 목표 4(Ruling 319) — 전후 지도를 좌우로 나란히. 한 지도에 겹치지 않는다.
export const StyledMapSurface = styled.div`
  height: ${MAP_SURFACE_HEIGHT};
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;

// 경로 — 구간 변경 승인 › 학생. 목록으로 돌아가는 길.
export const StyledBreadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);

  a {
    color: var(--text-primary);
    text-decoration: underline;
  }
`;
