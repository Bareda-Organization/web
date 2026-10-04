import styled from "@emotion/styled";
import { css } from "@emotion/react";
import type { ButtonSize, ButtonVariant } from "./Button";

// 시안 kit 3절 — 호버는 마우스 기기에서만(터치에서 호버가 남지 않게) 색만 바꾸고, 누르는 순간 눌림(scale .97)으로 반응한다.
const HOVER = "@media (hover: hover) and (pointer: fine)";

const variantStyle: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background: var(--accent-primary);
    color: var(--text-inverse);
    border: 1px solid transparent;
    ${HOVER} {
      &:hover:not(:disabled) {
        background: var(--accent-primary-hover);
      }
    }
    &:active:not(:disabled) {
      background: var(--accent-primary-press);
    }
  `,
  secondary: css`
    background: var(--surface-card);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    ${HOVER} {
      &:hover:not(:disabled) {
        background: var(--green-50);
      }
    }
  `,
  soft: css`
    background: var(--accent-primary-soft);
    color: var(--text-brand);
    border: 1px solid transparent;
    ${HOVER} {
      &:hover:not(:disabled) {
        background: var(--green-200);
      }
    }
  `,
  ghost: css`
    background: transparent;
    color: var(--text-brand);
    border: 1px solid transparent;
    ${HOVER} {
      &:hover:not(:disabled) {
        background: var(--green-50);
      }
    }
  `,
  // 위험 2단: 면은 확인 대화상자의 실행 버튼에만 쓴다. 목록·상세의 1단계 파괴 동작은 dangerQuiet(선).
  danger: css`
    background: var(--bad-solid);
    color: var(--on-bad);
    border: 1px solid transparent;
    ${HOVER} {
      &:hover:not(:disabled) {
        background: var(--t-bad);
      }
    }
  `,
  dangerQuiet: css`
    background: transparent;
    color: var(--t-bad);
    border: 1px solid var(--bad-solid);
    ${HOVER} {
      &:hover:not(:disabled) {
        background: var(--status-missed-soft);
      }
    }
  `,
  // 한 표에 여러 개가 반복되는 행 안의 위험 동작(예: 행마다 '회차 취소') — 면·선 없이 빨강 글자만.
  ghostDanger: css`
    background: transparent;
    color: var(--t-bad);
    border: 1px solid transparent;
    ${HOVER} {
      &:hover:not(:disabled) {
        background: var(--status-missed-soft);
      }
    }
  `,
};

const sizeStyle: Record<ButtonSize, { height: number; padding: string; fontSize: string; radius: string }> = {
  sm: { height: 28, padding: "0 10px", fontSize: "var(--fs-sm)", radius: "var(--radius-sm)" },
  md: { height: 36, padding: "0 14px", fontSize: "var(--fs-md)", radius: "var(--radius-control)" },
  lg: { height: 44, padding: "0 18px", fontSize: "var(--fs-lg)", radius: "var(--radius-control)" },
};

type StyledButtonProps = {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $block: boolean;
  $iconOnly: boolean;
};

export const StyledButton = styled.button<StyledButtonProps>`
  display: ${({ $block }) => ($block ? "flex" : "inline-flex")};
  width: ${({ $block, $iconOnly, $size }) => ($block ? "100%" : $iconOnly ? `${sizeStyle[$size].height}px` : "auto")};
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: ${({ $size }) => sizeStyle[$size].height}px;
  padding: ${({ $size, $iconOnly }) => ($iconOnly ? "0" : sizeStyle[$size].padding)};
  font-size: ${({ $size }) => sizeStyle[$size].fontSize};
  font-family: var(--font-sans);
  font-weight: var(--fw-medium);
  letter-spacing: -0.01em;
  line-height: 1;
  white-space: nowrap;
  border-radius: ${({ $size }) => sizeStyle[$size].radius};
  cursor: pointer;
  /* all 이 아니라 속성을 지정 — 눌림만 120ms 로 더 빠르다 */
  transition:
    background-color var(--dur-ui) var(--ease-out),
    border-color var(--dur-ui) var(--ease-out),
    color var(--dur-ui) var(--ease-out),
    transform var(--dur-press) var(--ease-out);

  ${({ $variant }) => variantStyle[$variant]}

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  /* 꺼짐 — 흐린 글자(대비 미달) 대신 면을 없애고 점선으로 말한다. 글자는 보조색이라 이유 문구를 읽을 수 있다. */
  &:disabled {
    background: transparent;
    color: var(--text-secondary);
    border: 1px dashed var(--border-default);
    cursor: not-allowed;
  }

  /* 움직임 줄이기 — 이동·크기만 빼고 색 전환은 둬서 눌림 변화가 계속 보이게 한다 */
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;
