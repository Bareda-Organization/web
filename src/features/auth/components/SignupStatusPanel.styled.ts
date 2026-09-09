import styled from "@emotion/styled";

export const StyledLayout = styled.div`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: var(--gutter-desktop);
`;

export const StyledContainer = styled.div`
  width: 100%;
  max-width: 440px;
`;

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
`;

export const StyledTitle = styled.h1`
  font: var(--text-h3);
  color: var(--text-primary);
  margin: 0;
`;

export const StyledField = styled.div`
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  font: var(--text-body);
  color: var(--text-primary);

  & > span:first-of-type {
    color: var(--text-secondary);
  }
`;

export const StyledFieldList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

export const StyledActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;
