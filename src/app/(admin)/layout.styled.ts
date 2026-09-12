import styled from "@emotion/styled";

// (staff)/layout.styled.ts 와 같은 골격(사이드바+헤더)을 쓰되 별도 파일로 둔다 — 두 레이아웃이
// 같은 스타일 객체를 공유하면 한쪽만 바꿔야 할 때 서로 얽힌다(BRIEF-a1.md §2.1).
export const StyledAdminShell = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--bg-subtle);
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
  padding: 0 24px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
`;

export const StyledAdminHeaderDate = styled.span`
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;

export const StyledAdminHeaderScope = styled.span`
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-bold);
  color: var(--text-primary);
`;
