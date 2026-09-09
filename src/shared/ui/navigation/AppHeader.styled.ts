import styled from "@emotion/styled";

export const StyledAppHeader = styled.header<{ $inverse: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--header-h);
  padding: 0 12px 0 6px;
  background: ${(props) => (props.$inverse ? "var(--surface-chrome)" : "var(--bg-base)")};
  color: ${(props) => (props.$inverse ? "var(--text-on-chrome)" : "var(--text-primary)")};
  border-bottom: 1px solid ${(props) => (props.$inverse ? "var(--border-chrome)" : "var(--border-subtle)")};
`;

export const StyledAppHeaderBack = styled.button`
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
`;

export const StyledAppHeaderBackSpacer = styled.span`
  width: 12px;
`;

export const StyledAppHeaderBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledAppHeaderTitle = styled.div`
  font: var(--fw-bold) 17px / 1.3 var(--font-sans);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StyledAppHeaderSubtitle = styled.div<{ $inverse: boolean }>`
  font: var(--fw-light) var(--fs-micro) / 1.4 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: ${(props) => (props.$inverse ? "var(--text-on-chrome-muted)" : "var(--text-secondary)")};
`;

export const StyledAppHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;
