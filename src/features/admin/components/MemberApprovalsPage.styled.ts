import styled from "@emotion/styled";

export const StyledMemberApprovalsLayout = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 var(--s5) var(--s5);
`;

// 왼쪽 목록(+ 승인 규칙) · 오른쪽 처리 칸 — 시안 폭 비율 658 : 454
export const StyledApprovalGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 658fr) minmax(0, 454fr);
  gap: var(--s4);
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledApprovalLeft = styled.div`
  display: grid;
  gap: var(--s4);
`;

export const StyledListHeading = styled.h3`
  margin: 0;
  padding: var(--s4) var(--s4) var(--s2);
  font: var(--fw-bold) var(--fs-lg) / 1.4 var(--font-sans);
`;

export const StyledApplicant = styled.div`
  display: grid;
  gap: 2px;

  b {
    font-weight: var(--fw-bold);
  }

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledAcademyCell = styled.div`
  display: grid;
  grid-template-columns: 8px 1fr;
  column-gap: 8px;
  align-items: baseline;

  small {
    grid-column: 2;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledAcademyDot = styled.i`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--c-a2);
`;

export const StyledStaffCell = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
`;

export const StyledRulesCard = styled.section`
  padding: var(--s4);
  border-radius: var(--radius-card);
  background: var(--surface-sunken);

  h3 {
    margin: 0 0 var(--s3);
    font: var(--fw-bold) var(--fs-lg) / 1.4 var(--font-sans);
  }

  ul {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: 6px;
    font-size: var(--fs-sm);
  }

  a {
    color: inherit;
    text-decoration: underline;
  }
`;

// ── 처리 칸 ────────────────────────────────────────────────────────────────
export const StyledPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  margin-bottom: var(--s3);

  h3 {
    margin: 0;
    font: var(--fw-bold) var(--fs-lg) / 1.4 var(--font-sans);
  }
`;

export const StyledPanelBody = styled.div`
  display: grid;
  gap: var(--s4);
  padding: var(--s4);
`;

export const StyledStaffSub = styled.span`
  color: var(--text-secondary);
  font-weight: var(--fw-regular);

  b {
    color: var(--text-primary);
    font-weight: var(--fw-bold);
  }
`;

export const StyledSteps = styled.ol`
  margin: var(--s2) 0 var(--s3);
  padding-left: 20px;
  display: grid;
  gap: 4px;

  a {
    color: inherit;
    text-decoration: underline;
  }
`;

export const StyledPanelActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: var(--s2);
`;

export const StyledPanelNote = styled.p`
  margin: 0;
  font-size: var(--fs-xs);
  line-height: 1.5;
  color: var(--text-secondary);
`;
