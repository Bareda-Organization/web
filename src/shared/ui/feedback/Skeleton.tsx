import type { HTMLAttributes } from "react";
import { StyledSkeleton, StyledSkeletonGroup, StyledSkeletonRow, StyledVisuallyHidden } from "./Skeleton.styled";

export type SkeletonVariant = "text" | "title" | "value" | "detail" | "bar" | "chart";

export type SkeletonProps = HTMLAttributes<HTMLSpanElement> & {
  /** 자리 모양 — text 12px · title 16px · value 지표 큰 숫자 32px · detail 설명 줄 · bar 14px 막대 · chart 150px 판 */
  variant?: SkeletonVariant;
  /** 폭을 따로 정할 때(숫자는 px) */
  width?: string | number;
};

/** 불러오는 중 뼈대 한 조각 — 최종 화면의 실제 자리 모양과 같은 크기로 둔다(데이터가 들어와도 자리가 밀리지 않게). 보조기기에는 숨긴다. */
export const Skeleton = ({ variant = "text", width, ...rest }: SkeletonProps) => (
  <StyledSkeleton aria-hidden="true" $variant={variant} $width={width} {...rest} />
);

/** 뼈대 표의 한 줄(44px) — 칸 모양 조각들을 가로로 놓는다. */
export const SkeletonRow = ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <StyledSkeletonRow aria-hidden="true" {...rest}>
    {children}
  </StyledSkeletonRow>
);

/**
 * 뼈대를 감싸는 묶음 — 보조기기에는 "불러오는 중…" 한 줄과 aria-busy 로 알린다.
 * 제목·필터·기간처럼 이미 아는 부분은 뼈대로 가리지 않고 이 묶음 밖에 둔다.
 */
export const SkeletonGroup = ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <StyledSkeletonGroup role="status" aria-busy="true" {...rest}>
    <StyledVisuallyHidden>불러오는 중…</StyledVisuallyHidden>
    {children}
  </StyledSkeletonGroup>
);
