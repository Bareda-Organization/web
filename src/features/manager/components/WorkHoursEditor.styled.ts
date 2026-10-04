import styled from "@emotion/styled";

export const StyledWorkHoursWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// 요일 · 출근 – 퇴근 — 머리글과 일곱 줄이 같은 네 칸 격자를 쓴다.
export const StyledWorkHoursRow = styled.div`
  display: grid;
  grid-template-columns: 56px 1fr 12px 1fr;
  align-items: center;
  gap: 8px;
`;

export const StyledWorkHoursTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`;

// 역할 선택과 붙어 보이지 않게 위 여백을 두고, 열 머리글(요일·출근·퇴근)이 아래 열과 같은 폭으로 놓인다(B1 #28).
export const StyledWorkHoursTitle = styled.strong`
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  letter-spacing: 0.02em;
  color: var(--text-secondary);
`;

export const StyledWorkHoursNote = styled.small`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledWorkHoursHead = styled(StyledWorkHoursRow)`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledWorkHoursDash = styled.span`
  text-align: center;
  color: var(--text-secondary);
`;

export const StyledWorkHoursFoot = styled.p`
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;
