import styled from "@emotion/styled";

export const StyledWorkHoursWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const StyledWorkHoursRow = styled.div`
  display: grid;
  grid-template-columns: 56px 1fr 1fr;
  align-items: center;
  gap: 10px;
`;

// 역할 선택과 붙어 보이지 않게 위 여백을 두고, 열 머리글(요일·출근·퇴근)이 아래 세 열과 같은 폭으로 놓인다(B1 #28).
export const StyledWorkHoursTitle = styled.strong`
  margin-top: 12px;
  font-size: var(--fs-body);
  color: var(--text-primary);
`;

export const StyledWorkHoursHead = styled(StyledWorkHoursRow)`
  font-size: var(--fs-caption);
  color: var(--text-secondary);
`;
