import type { HTMLAttributes, ReactNode } from "react";
import { StyledListRow, StyledListRowDescription, StyledListRowSide, StyledListRowTitle, StyledListRows } from "./lists.styled";
import type { ListRowTone } from "./lists.styled";

/** 목록 행의 묶음 — 카드 안에서 "지금 처리할 것"처럼 긴급도 순으로 쌓는다. */
export const ListRows = ({ children, ...rest }: HTMLAttributes<HTMLUListElement>) => <StyledListRows {...rest}>{children}</StyledListRows>;

export type ListRowProps = Omit<HTMLAttributes<HTMLLIElement>, "title"> & {
  /** bad ◆ 위험 · warn ▲ 주의 · info ⓘ 정보 · ok ● 이상 없음 — 색만으로 말하지 않도록 모양이 붙는다 */
  tone?: ListRowTone;
  /** 제목 줄 — 칩·배지를 이름 옆에 함께 둘 수 있다 */
  title: ReactNode;
  description?: ReactNode;
  /** 오른쪽 큰 숫자(처리 건수) */
  count?: ReactNode;
  /** 오른쪽 동작 버튼 — count 와 함께 쓰지 않는다 */
  action?: ReactNode;
};

export const ListRow = ({ tone, title, description, count, action, ...rest }: ListRowProps) => (
  <StyledListRow $tone={tone} {...rest}>
    <StyledListRowTitle>{title}</StyledListRowTitle>
    {description ? <StyledListRowDescription>{description}</StyledListRowDescription> : null}
    {count !== undefined ? <StyledListRowSide $isCount>{count}</StyledListRowSide> : action ? <StyledListRowSide $isCount={false}>{action}</StyledListRowSide> : null}
  </StyledListRow>
);
