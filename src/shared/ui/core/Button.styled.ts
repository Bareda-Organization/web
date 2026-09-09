import styled from "@emotion/styled";
import { css } from "@emotion/react";
import type { ButtonSize, ButtonVariant } from "./Button";

const variantStyle: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background: var(--accent-primary);
    color: var(--text-inverse);
    border: 1px solid transparent;
  `,
  secondary: css`
    background: var(--surface-card);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  `,
  soft: css`
    background: var(--accent-primary-soft);
    color: var(--text-brand);
    border: 1px solid transparent;
  `,
  ghost: css`
    background: transparent;
    color: var(--text-brand);
    border: 1px solid transparent;
  `,
  danger: css`
    background: var(--status-missed);
    color: var(--white);
    border: 1px solid transparent;
  `,
};

const sizeStyle: Record<ButtonSize, { height: number; padding: string; fontSize: string; gap: number }> = {
  sm: { height: 36, padding: "0 14px", fontSize: "var(--fs-label-sm)", gap: 6 },
  md: { height: 44, padding: "0 18px", fontSize: "var(--fs-label)", gap: 8 },
  lg: { height: 52, padding: "0 22px", fontSize: "var(--fs-body)", gap: 8 },
};

type StyledButtonProps = {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $block: boolean;
};

// 원본은 hover/press 를 onMouseEnter·onMouseDown 으로 감시해 inline style 을 바꿨다
// (인라인 style 은 :hover·:active 를 못 쓰기 때문). Emotion 은 실제 CSS 이므로
// 의사 클래스로 옮겨 상태(useState) 없이 같은 결과를 낸다 — Button.prompt.md 참고.
export const StyledButton = styled.button<StyledButtonProps>`
  display: ${({ $block }) => ($block ? "flex" : "inline-flex")};
  width: ${({ $block }) => ($block ? "100%" : "auto")};
  align-items: center;
  justify-content: center;
  gap: ${({ $size }) => sizeStyle[$size].gap}px;
  height: ${({ $size }) => sizeStyle[$size].height}px;
  padding: ${({ $size }) => sizeStyle[$size].padding};
  font-size: ${({ $size }) => sizeStyle[$size].fontSize};
  font-family: var(--font-sans);
  font-weight: var(--fw-medium);
  letter-spacing: -0.01em;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition:
    var(--transition-control),
    transform var(--dur-fast) var(--ease-standard);

  ${({ $variant }) => variantStyle[$variant]}

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }

  &:active:not(:disabled) {
    transform: scale(var(--press-scale));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }
`;
