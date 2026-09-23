import styled from "@emotion/styled";

import { MAP_SURFACE_HEIGHT } from "@/features/map/mapSurfaceSize";

// ChangeApprovalDetail.styled.ts 의 StyledMapSurface 와 같은 크기·테두리 규칙.
export const StyledMapSurface = styled.div`
  height: ${MAP_SURFACE_HEIGHT};
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;

export const StyledMapCaption = styled.p`
  margin: 8px 0 0;
  color: var(--text-tertiary);
  font: var(--fw-regular) var(--fs-micro) / 1.5 var(--font-sans);
`;
