import styled from "@emotion/styled";

export const StyledStopsPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/* 2026-09-22 사용자 지시 — 목록은 좌측에 모으고 가로로 늘리지 않는다. 화면이 넓으면 행 하나가
   3,000px 까지 늘어나 순번·이름·버튼이 서로 멀어졌다. 세로로 길면 이 상자 안에서 스크롤한다. */
export const StyledStopList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 560px;
  max-height: min(48vh, 520px);
  overflow-y: auto;
`;

/* 긴 주소가 한 줄을 밀어내지 않게 — 넘치면 줄바꿈한다(잘라내면 어느 자리인지 못 읽는다). */
export const StyledStopName = styled.span`
  overflow-wrap: anywhere;
`;

export const StyledStopRow = styled.div<{ $dragging?: boolean }>`
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--surface-mist);
  cursor: grab;
  opacity: ${(props) => (props.$dragging ? 0.4 : 1)};
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
  max-width: 560px;
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
