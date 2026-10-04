import styled from "@emotion/styled";

// R48: 화이트 셸 — 크롬(머리줄·사이드바)은 색이 아니라 얇은 선으로 본문과 가른다.
export const StyledStaffShell = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
`;

export const StyledStaffMain = styled.main`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

export const StyledStaffHeader = styled.header`
  height: var(--header-h);
  flex: 0 0 var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s4);
  padding: 0 var(--s5);
  background: var(--surface-chrome);
  border-bottom: 1px solid var(--border-chrome);
  color: var(--text-secondary);
  font-size: var(--fs-md);
`;

export const StyledStaffHeaderDate = styled.span`
  font-size: var(--fs-md);
  color: var(--text-secondary);
`;

// 긴 학원명도 오른쪽 메뉴를 밀지 않게 말줄임.
export const StyledStaffHeaderAcademy = styled.span`
  max-width: min(36vw, 440px);
  margin-right: var(--s2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  color: var(--text-primary);
`;

// 머리 양쪽 묶음 — 왼쪽은 뒤로 + 날짜·시각, 오른쪽은 학원 이름 + 알림 · 비밀번호 변경 · 로그아웃(2026-09-23).
export const StyledStaffHeaderSide = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;
