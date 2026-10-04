import styled from "@emotion/styled";

// 옆 패널 · 등록 창의 구획 — 제목 + 아래 내용, 구획 사이는 가는 선.
export const StyledPanelSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  padding-top: var(--s4);
  border-top: 1px solid var(--border-subtle);

  &:first-of-type {
    padding-top: 0;
    border-top: 0;
  }
`;

export const StyledPanelSectionHead = styled.h3`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0;
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  letter-spacing: 0.02em;
  color: var(--text-secondary);

  small {
    font-weight: var(--fw-regular);
    font-size: var(--fs-sm);
  }
`;

export const StyledPanelGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s3);
`;

// 이름 옆에 놓이는 역할 칩 — 패널 제목 줄 바로 아래.
export const StyledRoleChip = styled.span`
  align-self: flex-start;
  padding: 2px 10px;
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-fill);
  font: var(--fw-regular) var(--fs-xs) / 1.6 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledAssignSection = styled(StyledPanelSection)`
  gap: 0;
`;

export const StyledAssignRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--s3);
  padding: var(--s3) 0;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;

  &:first-of-type {
    margin-top: var(--s2);
  }
`;

export const StyledAssignDay = styled.span`
  color: var(--text-secondary);
`;

export const StyledAssignItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: 2px 0;
`;

// 옆 패널 맨 아래 — 왼쪽 삭제(+ 잠금 사유), 오른쪽 취소 · 저장.
export const StyledPanelFooter = styled.div`
  display: flex;
  align-items: center;
  gap: var(--s2);
  width: 100%;

  & > span:empty {
    flex: 1;
  }
`;

export const StyledPanelFootNote = styled.small`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

// 확인 대화상자의 영향 표 — 항목 이름 + 설명(삭제 · 비밀번호 초기화).
export const StyledKvList = styled.dl`
  margin: 12px 0;
  font-size: var(--fs-sm);

  & > div {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
  }
`;
