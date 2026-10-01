import { Fragment, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RosterColumn } from "../../types";
import { Button } from "../core/Button";
import {
  StyledRosterTable,
  StyledRosterTableElement,
  StyledRosterTableHeadRow,
  StyledRosterTableHeadCell,
  StyledRosterTableRow,
  StyledRosterTableCell,
  StyledRosterGroupRow,
  StyledRosterGroupCell,
  StyledRosterGroupButton,
  StyledRosterGroupCount,
  StyledRosterEmptyAction,
} from "./RosterTable.styled";

export type RosterTableProps<T = Record<string, unknown>> = HTMLAttributes<HTMLDivElement> & {
  columns?: RosterColumn<T>[];
  rows?: T[];
  onRowClick?: (row: T) => void;
  /** 행이 0건일 때 머리글 아래에 보일 문구 — 안 주면 기본 문구 */
  emptyMessage?: string;
  /** 목록을 불러오는 중 — 참이면 행이 0건이어도 빈 목록 문구 대신 불러오는 중 문구를 보인다 */
  loading?: boolean;
  /** 조회가 실패했다 — 행이 없을 때 "표시할 내용이 없습니다" 대신 불러오지 못했다고 보인다(없는 것이 아니라 못 읽은 것) */
  hasError?: boolean;
  /** 조회 실패로 행이 없을 때 [다시 시도] 버튼이 부를 재조회 — 안 주면 버튼을 내지 않는다 */
  onRetry?: () => void;
  /** 행이 0건일 때 빈 목록 문구 아래에 보일 다음 행동(예: 학생 등록) — 불러오는 중·조회 실패에는 내지 않는다 */
  emptyAction?: { label: string; onClick: () => void };
  /** 이 키(`getRowKey` 값)를 가진 행을 잠깐 강조한다 — 방금 저장한 행을 찾게 한다 */
  highlightedKey?: string | number | null;
  /**
   * 행 고유 키 추출자. 원본은 `key={r.id || i}` 로 id 가 없으면 인덱스를 썼는데,
   * rows 가 제네릭이라 컴포넌트 스스로 내용 기반 키를 보장할 수 없다 — 호출자가
   * 실제 고유 필드를 넘기도록 훅을 열어 두고, 안 주면 원본과 같은 동작(id 우선,
   * 없으면 인덱스)으로 fallback 한다. 인덱스 fallback 이 남는 유일한 자리이며
   * 보고서에 그대로 적는다.
   */
  getRowKey?: (row: T, index: number) => string | number;
  /**
   * 행을 묶는 기준 한 가지(예: 승하차지 이름). 주면 묶음마다 머리줄이 생기고 접고 펼 수
   * 있다 — 안 주면 지금까지와 똑같이 평평한 표다.
   *
   * 묶음 차례는 `rows` 에 **먼저 나온 순서**를 따른다. 정렬을 새로 하지 않는 이유는 행
   * 순서가 이미 뜻을 갖고 있기 때문이다(명단은 정차 차례대로 온다).
   */
  groupBy?: (row: T) => string;
};

const defaultRowKey = <T,>(row: T, index: number): string | number => {
  const id = (row as { id?: string | number }).id;
  return id ?? index;
};

// 관계자 웹 명단 표 — 버스별 탑승 인원, 학생 명부, 매니저 목록.
export const RosterTable = <T,>({
  columns = [],
  rows = [],
  onRowClick,
  emptyMessage = "표시할 내용이 없습니다",
  loading = false,
  hasError = false,
  onRetry,
  emptyAction,
  highlightedKey = null,
  getRowKey = defaultRowKey,
  groupBy,
  ...rest
}: RosterTableProps<T>) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const byLabel = new Map<string, T[]>();
    rows.forEach((row) => {
      const label = groupBy(row);
      const bucket = byLabel.get(label);
      if (bucket) bucket.push(row);
      else byLabel.set(label, [row]);
    });
    return [...byLabel.entries()].map(([label, groupRows]) => ({ label, rows: groupRows }));
  }, [groupBy, rows]);

  const toggle = (label: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const renderRow = (row: T, index: number) => (
    <StyledRosterTableRow
      key={getRowKey(row, index)}
      $clickable={Boolean(onRowClick)}
      $highlighted={highlightedKey !== null && getRowKey(row, index) === highlightedKey}
      data-highlighted={highlightedKey !== null && getRowKey(row, index) === highlightedKey ? "true" : undefined}
      onClick={() => onRowClick?.(row)}
      // 클릭으로 여는 행은 키보드로도 열린다 — 행 안의 버튼에서 누른 키는 그 버튼 몫이라 넘기지 않는다.
      tabIndex={onRowClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onRowClick || event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onRowClick(row);
        }
      }}
    >
      {columns.map((column) => (
        <StyledRosterTableCell key={column.key} $align={column.align ?? "left"}>
          {column.render ? column.render(row) : ((row as Record<string, unknown>)[column.key] as ReactNode)}
        </StyledRosterTableCell>
      ))}
    </StyledRosterTableRow>
  );

  return (
    <StyledRosterTable {...rest}>
      <StyledRosterTableElement>
        <thead>
          <StyledRosterTableHeadRow>
            {columns.map((column) => (
              <StyledRosterTableHeadCell key={column.key} $align={column.align ?? "left"} $width={column.width}>
                {column.label}
              </StyledRosterTableHeadCell>
            ))}
          </StyledRosterTableHeadRow>
        </thead>
        <tbody>
          {groups
            ? groups.map((group) => {
                const open = !collapsed.has(group.label);
                return (
                  <Fragment key={group.label}>
                    <StyledRosterGroupRow>
                      <StyledRosterGroupCell colSpan={columns.length || 1}>
                        <StyledRosterGroupButton type="button" aria-expanded={open} onClick={() => toggle(group.label)}>
                          {open ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                          <span>{group.label}</span>
                          <StyledRosterGroupCount>{group.rows.length}명</StyledRosterGroupCount>
                        </StyledRosterGroupButton>
                      </StyledRosterGroupCell>
                    </StyledRosterGroupRow>
                    {open ? group.rows.map((row, index) => renderRow(row, index)) : null}
                  </Fragment>
                );
              })
            : rows.map((row, index) => renderRow(row, index))}
          {rows.length === 0 ? (
            <StyledRosterTableRow $clickable={false}>
              <StyledRosterTableCell $align="center" colSpan={columns.length || 1}>
                {loading ? "불러오는 중입니다" : hasError ? "목록을 불러오지 못했습니다" : emptyMessage}
                {!loading && hasError && onRetry ? (
                  <StyledRosterEmptyAction>
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                      다시 시도
                    </Button>
                  </StyledRosterEmptyAction>
                ) : null}
                {!loading && !hasError && emptyAction ? (
                  <StyledRosterEmptyAction>
                    <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
                      {emptyAction.label}
                    </Button>
                  </StyledRosterEmptyAction>
                ) : null}
              </StyledRosterTableCell>
            </StyledRosterTableRow>
          ) : null}
        </tbody>
      </StyledRosterTableElement>
    </StyledRosterTable>
  );
};
