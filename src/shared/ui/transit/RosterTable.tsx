import type { HTMLAttributes, ReactNode } from "react";
import type { RosterColumn } from "../../types";
import {
  StyledRosterTable,
  StyledRosterTableElement,
  StyledRosterTableHeadRow,
  StyledRosterTableHeadCell,
  StyledRosterTableRow,
  StyledRosterTableCell,
} from "./RosterTable.styled";

export type RosterTableProps<T = Record<string, unknown>> = HTMLAttributes<HTMLDivElement> & {
  columns?: RosterColumn<T>[];
  rows?: T[];
  onRowClick?: (row: T) => void;
  /**
   * 행 고유 키 추출자. 원본은 `key={r.id || i}` 로 id 가 없으면 인덱스를 썼는데,
   * rows 가 제네릭이라 컴포넌트 스스로 내용 기반 키를 보장할 수 없다 — 호출자가
   * 실제 고유 필드를 넘기도록 훅을 열어 두고, 안 주면 원본과 같은 동작(id 우선,
   * 없으면 인덱스)으로 fallback 한다. 인덱스 fallback 이 남는 유일한 자리이며
   * 보고서에 그대로 적는다.
   */
  getRowKey?: (row: T, index: number) => string | number;
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
  getRowKey = defaultRowKey,
  ...rest
}: RosterTableProps<T>) => {
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
          {rows.map((row, index) => (
            <StyledRosterTableRow
              key={getRowKey(row, index)}
              $clickable={Boolean(onRowClick)}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <StyledRosterTableCell key={column.key} $align={column.align ?? "left"}>
                  {column.render ? column.render(row) : ((row as Record<string, unknown>)[column.key] as ReactNode)}
                </StyledRosterTableCell>
              ))}
            </StyledRosterTableRow>
          ))}
        </tbody>
      </StyledRosterTableElement>
    </StyledRosterTable>
  );
};
