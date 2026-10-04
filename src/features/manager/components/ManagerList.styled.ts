import styled from "@emotion/styled";
import Link from "next/link";

export const StyledManagerLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

// 이름 · 전화번호 — 이름 굵게, 아래에 번호.
export const StyledNameCell = styled.div`
  display: flex;
  flex-direction: column;

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
`;

export const StyledTodayCell = styled.div`
  display: flex;
  flex-direction: column;
  font-size: var(--fs-sm);
`;

// 오늘 배치가 없다 — 굵은 앰버. 색만으로 말하지 않게 글자가 같이 있다.
export const StyledUnassigned = styled.span`
  font: var(--fw-bold) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--t-move);
`;

export const StyledMutedCell = styled.span`
  color: var(--text-secondary);
`;

// 알림 띠 오른쪽의 이동 링크 — 단추 모양(윤곽선).
export const StyledActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md, 8px);
  background: var(--surface-card);
  font: var(--fw-bold) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: var(--surface-fill);
  }
`;
