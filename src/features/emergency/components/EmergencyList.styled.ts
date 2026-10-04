import styled from "@emotion/styled";

export const StyledEmergencyLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

export const StyledEmergencyFilters = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

// 단말 기록 시각 — 접수 시각 아래의 참고 줄(R47 Ruling 744).
export const StyledEmergencyDeviceTime = styled.span`
  display: block;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;

export const StyledEmergencyPosition = styled.span`
  font-family: var(--font-sans);
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;

export const StyledEmergencyBoard = styled.div`
  display: block;
`;

export const StyledEmergencyStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
`;

export const StyledEmergencyCardHead = styled.header`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 16px 20px 12px;

  h2 {
    margin: 0;
    font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
  }
  span {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledSubLine = styled.small`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;
