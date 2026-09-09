import styled from "@emotion/styled";
import { css } from "@emotion/react";
import type { IconButtonTone } from "./IconButton";

const toneStyle: Record<IconButtonTone, ReturnType<typeof css>> = {
  plain: css`
    background: transparent;
    color: var(--text-secondary);
  `,
  soft: css`
    background: var(--accent-primary-soft);
    color: var(--text-brand);
  `,
  inverse: css`
    background: transparent;
    color: var(--text-on-chrome);
  `,
};

type StyledIconButtonProps = {
  $tone: IconButtonTone;
  $size: number;
};

export const StyledIconButton = styled.button<StyledIconButtonProps>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: var(--transition-control);
  ${({ $tone }) => toneStyle[$tone]}
`;
