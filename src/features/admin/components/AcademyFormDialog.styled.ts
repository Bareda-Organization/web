import styled from "@emotion/styled";

export const StyledDialogForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const StyledDialogFormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

// 옆 패널 본문의 구역 — 작은 굵은 이름 + 내용
export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const StyledSectionTitle = styled.h3`
  margin: 0;
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
  letter-spacing: 0.02em;
  color: var(--text-secondary);
`;

export const StyledCodeLine = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

export const StyledCode = styled.code`
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--surface-fill);
  font: var(--fw-regular) var(--fs-xs) / 1.4 var(--font-mono);
  color: var(--text-primary);
`;

// 소속 관계자 한 줄 — 머리글자 원 + 이름·아이디 + 최근 로그인 + 계정 관리 단추
export const StyledStaffRow = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
`;

export const StyledAvatar = styled.span`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface-fill);
  font: var(--fw-medium) var(--fs-xs) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledStaffName = styled.div`
  font-size: var(--fs-sm);

  b {
    font-weight: var(--fw-bold);
  }

  small {
    margin-left: 4px;
    color: var(--text-secondary);
  }
`;

export const StyledSubLine = styled.div`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;
