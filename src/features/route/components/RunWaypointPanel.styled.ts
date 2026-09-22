import styled from "@emotion/styled";

export const StyledWaypointPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const StyledWaypointInputRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

export const StyledWaypointCompare = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-mist);
`;

export const StyledWaypointCompareCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font: var(--fw-regular) var(--fs-body-sm) / 1.4 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledWaypointDeployedRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--surface-mist);
`;

export const StyledWaypointActionsRow = styled.div`
  display: flex;
  gap: 8px;
`;

/* 2026-09-22 — 기존 경로(좌) · 변경된 경로(우). 좁아지면 한 칸으로 쌓인다(반응형). */
export const StyledWaypointMapCompare = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
`;

export const StyledWaypointMapCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

/* 비교용이라 단독 지도(480px)보다 낮다 — 두 개가 나란히 서므로 세로를 다 쓰면 정보가 화면 밖으로 밀린다. */
export const StyledWaypointMapSurface = styled.div`
  height: 260px;
`;
