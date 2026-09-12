import styled from "@emotion/styled";

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
