import styled from "@emotion/styled";

export const StyledEmergencyAlertsLayout = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 var(--s5) var(--s5);
`;

export const StyledStamp = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
`;

export const StyledStampDot = styled.i<{ $live: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $live }) => ($live ? "var(--c-conf)" : "var(--c-move)")};
`;

export const StyledBandSlot = styled.div`
  margin-bottom: var(--s4);
`;

export const StyledBandActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
`;

// 왼쪽 목록 · 오른쪽 상시 칸 — 시안 폭 비율 658 : 470
export const StyledEmergencyGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 658fr) minmax(0, 470fr);
  gap: var(--s4);
  align-items: start;
  margin-top: var(--s4);

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledEmergencyLeft = styled.div`
  display: grid;
  gap: var(--s4);
`;

// 단말 기록 시각 — 접수 시각 아래의 참고 줄(R47 Ruling 744).
export const StyledEmergencyDeviceTime = styled.span`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledElapsed = styled.div<{ $urgent: boolean }>`
  display: grid;
  gap: 2px;
  font-variant-numeric: tabular-nums;

  b {
    font: var(--fw-bold) var(--fs-xl) / 1.2 var(--font-sans);
    color: ${({ $urgent }) => ($urgent ? "var(--t-bad)" : "var(--text-primary)")};
  }

  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledTwoLine = styled.div`
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

export const StyledAcademyLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

export const StyledAcademyDot = styled.i<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

export const StyledFootNote = styled.p`
  margin: var(--s4) 0 0;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

// ── 오른쪽 상시 칸 ─────────────────────────────────────────────────────────
export const StyledPanelBody = styled.div`
  display: grid;
  gap: var(--s3);
  padding: var(--s4);
`;

export const StyledPanelTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);

  h3 {
    margin: 0;
    font: var(--fw-bold) var(--fs-lg) / 1.4 var(--font-sans);
  }
`;

export const StyledMiniMap = styled.div`
  height: 150px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--surface-sunken);
  display: grid;
  place-items: center;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

export const StyledContactList = styled.div`
  display: grid;
  margin-top: var(--s2);

  h3 {
    margin: 0 0 var(--s2);
    font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
    letter-spacing: 0.02em;
    color: var(--text-secondary);
  }
`;

export const StyledContactRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--s3);
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);

  &:last-of-type {
    border-bottom: 0;
  }

  b {
    font-weight: var(--fw-bold);
  }

  small {
    margin-left: 6px;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }

  span {
    display: block;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledAckLine = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-weight: var(--fw-regular);
  color: var(--text-secondary);
`;
