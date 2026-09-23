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
