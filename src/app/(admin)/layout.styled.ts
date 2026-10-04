import styled from "@emotion/styled";

// (staff)/layout.styled.ts 와 같은 골격(사이드바+헤더)을 쓰되 별도 파일로 둔다 — 두 레이아웃이
// 같은 스타일 객체를 공유하면 한쪽만 바꿔야 할 때 서로 얽힌다(BRIEF-a1.md §2.1).
// R48: 화이트 셸 — 크롬(머리줄·사이드바)은 색이 아니라 얇은 선으로 본문과 가른다.
export const StyledAdminShell = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
`;

export const StyledAdminMain = styled.main`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

export const StyledAdminHeader = styled.header`
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

export const StyledAdminHeaderDate = styled.span`
  font-size: var(--fs-md);
  color: var(--text-secondary);
`;

// 긴 이름도 오른쪽 메뉴를 밀지 않게 말줄임 — 전체 값은 title 로 본다.
export const StyledAdminHeaderScope = styled.span`
  max-width: min(36vw, 440px);
  margin-right: var(--s2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  color: var(--text-primary);
`;

// 머리 양쪽 묶음 — 왼쪽은 뒤로 + 날짜·시각, 오른쪽은 역할 + 알림 · 비밀번호 변경 · 로그아웃.
export const StyledAdminHeaderSide = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;
