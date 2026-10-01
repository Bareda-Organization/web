import styled from "@emotion/styled";

// 보호자 연락처 칸 — 학생 정보와 다른 사람의 값이라 선으로 갈라 둔다(Ruling 326).
export const StyledGuardianSection = styled.section`
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
`;

export const StyledGuardianTitle = styled.h3`
  margin: 0;
  font: var(--fw-bold) var(--fs-body-sm) / 1.3 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledGuardianEmpty = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font: var(--fw-regular) var(--fs-micro) / 1.5 var(--font-sans);
`;

// 요일별 승하차 주소 — 학부모가 등록한 값을 읽기만 한다(STU-06). 보호자 칸과 같은 구역 모양이다.
export const StyledWeeklyAddressList = styled.ul`
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font: var(--fw-regular) var(--fs-body-sm) / 1.5 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledWeekdayLabel = styled.strong`
  display: inline-block;
  min-width: 2em;
`;
