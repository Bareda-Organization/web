import styled from "@emotion/styled";

export const StyledScheduleLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledScheduleFilters = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

// ScheduleScreen(§5.10) 이 이미 바깥 padding 을 쥐고 있어, 구역 전환 안쪽
// (ScheduleList·RunDayList) 은 padding 없이 세로 간격만 준다 — 이중 padding 방지.
export const StyledScheduleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// 정규 스케줄 구역의 건수 · [스케줄 등록] 줄 — 화면 제목은 ScheduleScreen 이 이미 쥐고 있어 이 구역은 제목 없이 도구 줄만 둔다.
export const StyledScheduleToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const StyledScheduleCount = styled.div`
  font: var(--fw-light) var(--fs-caption) / 1.6 var(--font-sans);
  letter-spacing: var(--ls-caption);
  color: var(--text-secondary);
`;

// ── R48 요일표 · 일일 회차 · 확인 창 ───────────────────────────────────────────────

export const StyledCancelKv = styled.dl`
  margin: 12px 0;
  font-size: var(--fs-sm);

  & > div {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
  }
`;

// 일일 회차 — 날짜 이동 줄 · 합계 · 표 안 칸.
export const StyledDateNav = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  label {
    font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
    color: var(--text-secondary);
  }
  span[data-total] {
    margin-left: auto;
    font-size: var(--fs-sm);
    color: var(--text-secondary);
  }
`;

export const StyledRunTime = styled.span`
  font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
  font-variant-numeric: tabular-nums;
`;

export const StyledRunSub = styled.small`
  display: block;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledRunNote = styled.div`
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

export const StyledCancelText = styled.span`
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

// 수정 옆 패널 — 두 칸 격자 · 미리보기 구획 · 아래 줄(삭제는 왼쪽, 나머지는 오른쪽).
export const StyledFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s3);

  & > div {
    display: flex;
    flex-direction: column;
    gap: var(--s2);
    min-width: 0;
  }
`;

export const StyledPreviewSection = styled.section`
  display: flex;
  flex-direction: column;
  margin-top: var(--s4);
  padding-top: var(--s4);
  border-top: 1px solid var(--border-subtle);

  h3 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 0 var(--s2);
    font: var(--fw-bold) var(--fs-xs) / 1.4 var(--font-sans);
    letter-spacing: 0.02em;
    color: var(--text-secondary);
  }
  h3 small {
    font-weight: var(--fw-regular);
    font-size: var(--fs-xs);
  }
`;

export const StyledPreviewRow = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: var(--s3);
  padding: 10px 0;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-sm);

  & > span {
    color: var(--text-secondary);
  }
`;

export const StyledPanelFootLeft = styled.div`
  display: flex;
  align-items: center;
  gap: var(--s2);
  width: 100%;

  & > span:empty {
    flex: 1;
  }
`;

// 요일표 — 차량 머리 줄 + (방향 행 × 요일 칸). 오늘 열은 면으로 구분한다.
export const StyledWeekGrid = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  th,
  td {
    padding: 0;
  }
  thead th {
    padding: 12px 8px;
    border-bottom: 1px solid var(--border-subtle);
    font: var(--fw-regular) var(--fs-sm) / 1.4 var(--font-sans);
    color: var(--text-secondary);
    text-align: center;
  }
  thead th:first-of-type {
    width: 176px;
    padding-left: 20px;
    text-align: left;
  }
  thead th[data-today="true"] {
    border-bottom: 2px solid var(--green-600);
    color: var(--text-primary);
    font-weight: var(--fw-bold);
  }
`;

export const StyledBusHead = styled.th`
  padding: 10px 20px !important;
  background: var(--surface-fill);
  text-align: left !important;
  font: var(--fw-regular) var(--fs-sm) / 1.4 var(--font-sans) !important;
  color: var(--text-secondary) !important;

  b {
    margin-right: 6px;
    color: var(--text-primary);
  }
`;

export const StyledDirectionCell = styled.th`
  padding: 10px 8px 10px 20px !important;
  text-align: left !important;
  font: var(--fw-regular) var(--fs-xs) / 1.4 var(--font-sans) !important;
  color: var(--text-secondary) !important;

  strong {
    display: block;
    font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
    color: var(--text-primary);
  }
`;

export const StyledDayCell = styled.td<{ $today: boolean }>`
  padding: 6px 4px !important;
  background: ${(p) => (p.$today ? "var(--surface-fill)" : "transparent")};
  border-bottom: 1px solid var(--border-subtle);
`;

// 칸 하나 — 정차지 수(큰 글자) + 상태. 기본 · 비활성(회색 면) · 정차지 0곳(앰버) · 빈 칸(+).
export const StyledScheduleCell = styled.button<{ $kind: "normal" | "off" | "empty" }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  padding: 4px;
  border: 1px solid ${(p) => (p.$kind === "empty" ? "var(--c-move)" : "var(--stone-300)")};
  border-radius: 8px;
  background: ${(p) => (p.$kind === "off" ? "var(--surface-fill)" : p.$kind === "empty" ? "var(--row-warn-bg)" : "var(--surface-card)")};
  color: ${(p) => (p.$kind === "off" ? "var(--text-secondary)" : p.$kind === "empty" ? "var(--t-move)" : "var(--text-primary)")};
  font: var(--fw-bold) var(--fs-lg) / 1.2 var(--font-sans);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: border-color var(--dur-ui) var(--ease-out);

  small {
    font: var(--fw-regular) var(--fs-xs) / 1.3 var(--font-sans);
  }
  &:hover {
    border-color: var(--green-600);
  }
  &:focus-visible {
    outline: 2px solid var(--green-600);
    outline-offset: 2px;
  }
`;

export const StyledNoRoute = styled.td`
  padding: 12px 20px !important;
  font-size: var(--fs-sm);
  color: var(--text-secondary);

  button {
    float: right;
  }
`;

export const StyledGridLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--text-secondary);

  span[data-swatch] {
    display: inline-block;
    width: 22px;
    height: 12px;
    margin-right: 6px;
    vertical-align: -2px;
    border: 1px solid var(--stone-300);
    border-radius: 4px;
  }
  span[data-swatch="off"] {
    background: var(--surface-fill);
  }
  span[data-swatch="empty"] {
    border-color: var(--c-move);
    background: var(--row-warn-bg);
  }
  em {
    margin-left: auto;
    font-style: normal;
  }
`;


export const StyledScheduleNote = styled.div`
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-sm);
  color: var(--text-secondary);

  b {
    color: var(--text-primary);
  }
`;
