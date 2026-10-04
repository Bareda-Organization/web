import type { HTMLAttributes, ReactNode } from "react";
import { StyledFilterBar, StyledFilterGroup, StyledFilterSummary } from "./FilterBar.styled";

export type FilterBarProps = HTMLAttributes<HTMLDivElement> & {
  /** 오른쪽 끝 요약 — 예: "총 137건" */
  summary?: ReactNode;
};

/** 필터 줄 — 조건 묶음(FilterGroup)·선택칸·검색칸을 한 줄에 놓고 모자라면 줄바꿈한다. 현재 값은 색 + 굵기로 모두 드러난다. */
export const FilterBar = ({ children, summary, ...rest }: FilterBarProps) => (
  <StyledFilterBar {...rest}>
    {children}
    {summary ? <StyledFilterSummary>{summary}</StyledFilterSummary> : null}
  </StyledFilterBar>
);

/** 이름 있는 조건 묶음 — 예: `기간 [오늘] [7일] [30일]` */
export const FilterGroup = ({ label, children, ...rest }: HTMLAttributes<HTMLDivElement> & { label: string }) => (
  <StyledFilterGroup role="group" aria-label={label} {...rest}>
    <span aria-hidden="true">{label}</span>
    {children}
  </StyledFilterGroup>
);
