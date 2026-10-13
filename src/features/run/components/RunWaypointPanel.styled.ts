import styled from "@emotion/styled";
import { MAP_SURFACE_HEIGHT } from "@/features/map";

export const StyledWaypointPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const StyledWaypointHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: var(--fs-h3);
  }
`;

export const StyledWaypointList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

export const StyledWaypointRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--fs-body-sm);
`;

export const StyledWaypointForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 520px;
`;

export const StyledFieldLabel = styled.span`
  font-size: var(--fs-body-sm);
  color: var(--text-primary);
`;

export const StyledHint = styled.p`
  margin: 0;
  font-size: var(--fs-micro);
  color: var(--text-secondary);
`;

export const StyledActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

export const StyledCompareGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

export const StyledCompareColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  > p {
    margin: 0;
    font-weight: 600;
    font-size: var(--fs-body-sm);
  }
`;

export const StyledCompareRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--fs-body-sm);
`;

export const StyledPreviewMap = styled.div`
  height: ${MAP_SURFACE_HEIGHT};
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;
