import styled from "@emotion/styled";

export const StyledRouteLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  padding: 24px;
`;

export const StyledBatchHint = styled.p`
  margin: -8px 0 0;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
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
export const StyledRouteCell = styled.button<{ $kind: "normal" | "off" | "empty" | "add" }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  padding: 4px;
  border: 1px solid ${(p) => (p.$kind === "empty" ? "var(--c-move)" : p.$kind === "add" ? "var(--border-subtle)" : "var(--stone-300)")};
  border-style: ${(p) => (p.$kind === "add" ? "dashed" : "solid")};
  border-radius: 8px;
  background: ${(p) => (p.$kind === "off" ? "var(--surface-fill)" : p.$kind === "empty" ? "var(--row-warn-bg)" : "var(--surface-card)")};
  color: ${(p) => (p.$kind === "off" ? "var(--text-secondary)" : p.$kind === "empty" ? "var(--t-move)" : p.$kind === "add" ? "var(--text-secondary)" : "var(--text-primary)")};
  font: var(--fw-bold) var(--fs-md) / 1.2 var(--font-sans);
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

// 삭제 확인의 영향 표 — 항목 이름 + 설명.
export const StyledDeleteKv = styled.dl`
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
