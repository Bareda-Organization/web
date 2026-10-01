import styled from "@emotion/styled";

export const StyledAuditLogLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledFilterRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

export const StyledFilterField = styled.div`
  min-width: 160px;
`;

export const StyledActorSearchField = styled(StyledFilterField)`
  min-width: 300px;
`;

export const StyledFieldLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
  color: var(--text-secondary);
`;

/* 행위자 검색칸(44px)을 다른 칸(Select·Input 48px)과 같은 높이 상자에 넣는다 — 줄이 아래 맞춤이라 4px 낮은 칸의 라벨만 4px 내려와 앉았다. */
export const StyledActorSearchBox = styled.div`
  display: flex;
  align-items: center;
  min-height: 48px;

  & > form {
    flex: 1;
  }
`;
