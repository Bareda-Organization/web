import styled from "@emotion/styled";

export const StyledStopsPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const StyledStopRow = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--surface-mist);
`;

export const StyledStopSeq = styled.span`
  font: var(--fw-bold) var(--fs-body-sm) / 1 var(--font-sans);
  color: var(--text-tertiary);
  text-align: center;
`;

export const StyledStopActions = styled.div`
  display: flex;
  gap: 4px;
`;

export const StyledAddStopRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
`;

export const StyledOptimizeRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  align-items: flex-end;
  gap: 8px;
`;

/* 주소 검색 결과 — 아직 반영되지 않은 지점을 다루는 자리(2026-09-22). */
export const StyledDraftBox = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
`;

export const StyledDraftHint = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font: var(--fw-regular) var(--fs-micro) / 1.5 var(--font-sans);
`;

export const StyledDraftActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
