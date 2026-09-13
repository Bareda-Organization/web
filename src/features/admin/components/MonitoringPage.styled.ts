import styled from "@emotion/styled";

export const StyledMonitoringLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledFilterRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: 320px;
`;

// F4 — 자리표시(점선 테두리)를 걷어내고 실제 `MapSurface` 를 담는 크기 지정 컨테이너로
// 바꾼다. `overflow: hidden` 은 지도 SDK 가 만드는 내부 타일 레이어가 둥근 모서리를
// 넘치지 않게 한다.
export const StyledMapSurface = styled.div`
  height: 220px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;

export const StyledRosterStopBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--border-subtle);

  &:first-of-type {
    border-top: none;
  }
`;

export const StyledRosterStopTitle = styled.p`
  font-weight: var(--fw-bold);
`;

export const StyledRosterStudentRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
