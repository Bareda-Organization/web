import styled from "@emotion/styled";
import { css, keyframes } from "@emotion/react";
import type { SkeletonVariant } from "./Skeleton";

// 제자리에서 오가는 반복 움직임은 ease-out 이 아니라 ease-in-out.
const pulse = keyframes`
  from { opacity: 1; }
  to { opacity: 0.45; }
`;

const variantStyle: Record<SkeletonVariant, ReturnType<typeof css>> = {
  text: css``,
  title: css`
    height: 16px;
    width: 46%;
  `,
  value: css`
    height: 32px;
    width: 52%;
    margin: 10px 0 8px;
  `,
  detail: css`
    width: 70%;
  `,
  bar: css`
    height: 14px;
    border-radius: var(--radius-xs);
  `,
  chart: css`
    height: 150px;
    border-radius: var(--radius-md);
  `,
};

export const StyledSkeleton = styled.span<{ $variant: SkeletonVariant; $width?: string | number }>`
  display: block;
  height: 12px;
  background: var(--surface-fill);
  border-radius: var(--radius-sm);
  animation: ${pulse} 1.1s ease-in-out infinite alternate;
  ${({ $variant }) => variantStyle[$variant]}
  ${({ $width }) => ($width === undefined ? null : css`width: ${typeof $width === "number" ? `${$width}px` : $width};`)}

  /* 반복 깜빡임은 이해를 돕지 않는다 — 움직임 줄이기를 켠 사용자에게는 멈춘다 */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const StyledSkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--s5);
  height: 44px;
  padding: 0 var(--s4);
  border-top: 1px solid var(--border-subtle);

  & > span {
    flex: none;
  }
`;

export const StyledSkeletonGroup = styled.div`
  position: relative;
`;

// 화면에서는 안 보이고 보조기기에만 읽히는 글
export const StyledVisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
