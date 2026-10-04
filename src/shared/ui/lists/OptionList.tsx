import type { HTMLAttributes } from "react";
import { StyledOptionList, StyledOptionListItem } from "./lists.styled";

/** 항목 목록(후보 목록) — 위아래 선만 있는 목록. 카드 안에 흰 상자를 또 넣지 않는다. */
export const OptionList = ({ children, ...rest }: HTMLAttributes<HTMLUListElement>) => <StyledOptionList {...rest}>{children}</StyledOptionList>;

export type OptionListItemProps = HTMLAttributes<HTMLLIElement> & {
  /** 선택된 항목 — 연한 면 + 둘레선 */
  picked?: boolean;
};

export const OptionListItem = ({ picked = false, children, ...rest }: OptionListItemProps) => (
  <StyledOptionListItem $picked={picked} aria-current={picked ? "true" : undefined} {...rest}>
    {children}
  </StyledOptionListItem>
);
