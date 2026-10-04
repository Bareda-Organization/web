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

// 조회 조건 묶음 — 연한 면 위에 줄을 두 개 쌓는다(기간 · 날짜 / 학원 · 행위자 · 동작 · 조회)
export const StyledFilterPanel = styled.div`
  display: grid;
  gap: var(--s3);
  margin: var(--s4) 0;
  padding: var(--s4);
  border-radius: var(--radius-card);
  background: var(--surface-sunken);
`;

export const StyledFilterHint = styled.span`
  align-self: center;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledTwoLine = styled.div`
  display: grid;
  gap: 2px;

  b {
    font-weight: var(--fw-bold);
  }

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledCellDot = styled.i<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;
