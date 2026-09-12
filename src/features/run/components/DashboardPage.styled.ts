import styled from "@emotion/styled";

export const StyledDashboardLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledStatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
`;

export const StyledContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  align-items: start;
`;

export const StyledLiveCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const StyledMapSurface = styled.div`
  height: 160px;
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  border: 1px dashed var(--border-default);
`;

export const StyledLiveEmpty = styled.p`
  color: var(--text-secondary);
  font-size: var(--fs-body-sm);
`;

export const StyledLiveItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 0;
  border-top: 1px solid var(--border-subtle);
`;

export const StyledLiveItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: var(--fw-bold);
`;

export const StyledLiveItemMeta = styled.span`
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
