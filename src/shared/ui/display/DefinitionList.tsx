import type { HTMLAttributes, ReactNode } from "react";
import styled from "@emotion/styled";

export type DefinitionItem = { term: string; value: ReactNode };

const StyledDefinitionList = styled.dl`
  display: grid;
  grid-template-columns: 116px 1fr;
  margin: 0;
  font-size: var(--fs-sm);

  dt,
  dd {
    margin: 0;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-subtle);
    overflow-wrap: anywhere;
  }

  dt {
    color: var(--text-secondary);
  }

  dd {
    font-weight: var(--fw-medium);
  }

  dt:last-of-type,
  dd:last-of-type {
    border-bottom: 0;
  }
`;

/** 정의 목록(kv) — 왼쪽 이름 116px + 오른쪽 값. 옆 패널·상세의 "항목: 값" 묶음. */
export const DefinitionList = ({ items, ...rest }: HTMLAttributes<HTMLDListElement> & { items: DefinitionItem[] }) => (
  <StyledDefinitionList {...rest}>
    {items.map((item) => (
      <FragmentRow key={item.term} item={item} />
    ))}
  </StyledDefinitionList>
);

const FragmentRow = ({ item }: { item: DefinitionItem }) => (
  <>
    <dt>{item.term}</dt>
    <dd>{item.value}</dd>
  </>
);
