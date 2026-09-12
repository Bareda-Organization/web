import styled from "@emotion/styled";

export const StyledTodayRunLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledBusSwitcher = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const StyledBusSwitcherButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-default);
  background: ${(props) => (props.$active ? "var(--nav-active-bg)" : "var(--bg-base)")};
  color: ${(props) => (props.$active ? "var(--nav-active-text)" : "var(--text-primary)")};
  font-size: var(--fs-body-sm);
  cursor: pointer;
`;

export const StyledContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  align-items: start;
`;

export const StyledSidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const StyledMapSurface = styled.div`
  height: 160px;
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  border: 1px dashed var(--border-default);
  margin: 8px 0;
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
