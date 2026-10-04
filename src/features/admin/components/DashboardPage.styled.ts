import styled from "@emotion/styled";
import { css } from "@emotion/react";

// 대시보드(`admin/dashboard` 시안) 전용 배치 — 카드 · 표 · 막대 · 선 그래프. 색은 전부 토큰이다.

export const StyledDashboardPage = styled.div`
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

export type StampTone = "live" | "stale" | "loading";

const STAMP_COLOR: Record<StampTone, string> = { live: "var(--c-conf)", stale: "var(--c-move)", loading: "var(--c-end)" };

export const StyledStampDot = styled.i<{ $tone: StampTone }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $tone }) => STAMP_COLOR[$tone]};
`;

export const StyledBannerSlot = styled.div`
  margin-bottom: var(--s4);
`;

const gridBase = css`
  display: grid;
  gap: var(--s4);
  margin-bottom: var(--s4);
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

// 3칸(처리할 것 · 일별 그래프 · 처리 결과) — 시안 폭 비율 278 : 463 : 371
export const StyledGridThree = styled.div`
  ${gridBase}
  grid-template-columns: minmax(0, 278fr) minmax(0, 463fr) minmax(0, 371fr);
`;

// 2칸(오늘 회차 표 · 주간 지표 + 최근 기록) — 시안 폭 비율 658 : 470
export const StyledGridTwo = styled.div`
  ${gridBase}
  grid-template-columns: minmax(0, 658fr) minmax(0, 470fr);
`;

export const StyledStack = styled.div`
  display: grid;
  gap: var(--s4);
`;

export const StyledCardBody = styled.section`
  padding: var(--s4) var(--s4) var(--s5);
`;

export const StyledCardHeading = styled.h2`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 var(--s3);
  font: var(--fw-bold) var(--fs-lg) / 1.4 var(--font-sans);
  color: var(--text-primary);

  small {
    font: var(--fw-regular) var(--fs-sm) / 1.4 var(--font-sans);
    color: var(--text-secondary);
  }

  & > :last-child:not(small) {
    margin-left: auto;
  }
`;

export const StyledRowLink = styled.span`
  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  a:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

export const StyledOkTitle = styled.span`
  color: var(--t-ok, var(--text-brand));
`;

export const StyledWarnText = styled.span`
  color: var(--t-move);
  font-weight: var(--fw-bold);
`;

// ── 일별 선 그래프 · 막대 그래프(SVG) ────────────────────────────────────
export const StyledChartSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;

  .base {
    stroke: var(--border-default);
    stroke-width: 1;
  }

  .grid {
    stroke: var(--border-subtle);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }

  .ax {
    fill: var(--text-secondary);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .dl {
    font-size: 12px;
    font-weight: 700;
    fill: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }
`;

// ── 가로 막대(처리 결과 · 진행률 · 상태별 회차) ──────────────────────────
export const StyledHBar = styled.div<{ $slim?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $slim }) => ($slim ? "minmax(60px, 1fr) 42px" : "64px 1fr auto")};
  align-items: center;
  gap: var(--s3);
  margin: ${({ $slim }) => ($slim ? "0" : "10px 0")};
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;
`;

export const StyledTrack = styled.div`
  height: 10px;
  border-radius: 5px;
  background: var(--surface-fill);
  overflow: hidden;
`;

export const StyledFill = styled.i<{ $color: string; $width: number }>`
  display: block;
  width: ${({ $width }) => $width}%;
  height: 100%;
  border-radius: 5px;
  background: ${({ $color }) => $color};
`;

export const StyledFaint = styled.div`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

// ── 표(오늘 회차 · 학원별 지표) ──────────────────────────────────────────
export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;

  th {
    padding: 8px 12px;
    text-align: left;
    font: var(--fw-regular) var(--fs-xs) / 1.4 var(--font-sans);
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-default);
    white-space: nowrap;
  }

  td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  /* 학원 이름이 시안보다 긴 실서버 값에서도 메모 칸이 카드 밖으로 잘리지 않게 줄바꿈을 허용하고, 시각 · 칩은 한 줄로 둔다 */
  td b,
  td:nth-child(4),
  td:nth-child(5) {
    white-space: nowrap;
  }

  tbody tr:last-of-type td {
    border-bottom: 0;
  }

  .num {
    text-align: right;
  }
`;

export const StyledAcademyDot = styled.i<{ $slot: 0 | 1 }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${({ $slot }) => ($slot === 0 ? "var(--c-a1)" : "var(--c-a2)")};
`;

export const StyledTableWrap = styled.div`
  overflow-x: auto;
`;

export const StyledSubHeading = styled.div`
  margin: var(--s4) 0 var(--s2);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-default);
  font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
`;

export const StyledStatusBarRow = styled.div`
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--s3);
  margin-top: var(--s2);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledStatusBar = styled.div`
  display: flex;
  gap: 2px;
  height: 14px;

  i {
    display: block;
    border-radius: 3px;
  }
`;

export const StyledHealthRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--s4);
`;

export const StyledSkeletonGrid = styled.div`
  display: grid;
  gap: var(--s4);
`;
