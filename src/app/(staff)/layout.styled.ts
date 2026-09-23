import styled from "@emotion/styled";

export const StyledStaffShell = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--bg-subtle);
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
  padding: 0 24px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
`;

export const StyledStaffHeaderDate = styled.span`
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;

export const StyledStaffHeaderAcademy = styled.span`
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-bold);
  color: var(--text-primary);
`;

// 머리 양쪽 묶음 — 왼쪽은 뒤로 + 날짜, 오른쪽은 학원 이름 + 로그아웃(2026-09-23).
export const StyledStaffHeaderSide = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
