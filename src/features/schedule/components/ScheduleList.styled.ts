import styled from "@emotion/styled";

export const StyledScheduleLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledScheduleFilters = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

// ScheduleScreen(§5.10) 이 이미 바깥 padding 을 쥐고 있어, 구역 전환 안쪽
// (ScheduleList·RunDayList) 은 padding 없이 세로 간격만 준다 — 이중 padding 방지.
export const StyledScheduleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;
