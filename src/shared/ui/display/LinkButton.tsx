import Link from "next/link";
import type { ComponentProps } from "react";
import styled from "@emotion/styled";

type LinkButtonVariant = "primary" | "secondary";

const StyledLinkButton = styled(Link)<{ $variant: LinkButtonVariant; $size: "sm" | "md" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: ${({ $size }) => ($size === "sm" ? "28px" : "36px")};
  padding: 0 ${({ $size }) => ($size === "sm" ? "12px" : "16px")};
  border-radius: var(--radius-control);
  background: ${({ $variant }) => ($variant === "primary" ? "var(--accent-primary)" : "var(--surface-card)")};
  box-shadow: ${({ $variant }) => ($variant === "primary" ? "none" : "inset 0 0 0 1px var(--border-default)")};
  color: ${({ $variant }) => ($variant === "primary" ? "var(--text-inverse)" : "var(--text-primary)")};
  font: var(--fw-medium) var(--fs-sm) / 1 var(--font-sans);
  text-decoration: none;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      ${({ $variant }) => ($variant === "primary" ? "background: var(--accent-primary-hover);" : "box-shadow: inset 0 0 0 1px var(--text-secondary);")}
    }
  }
`;

/** 단추 모양의 링크 — 화면 이동은 단추가 아니라 링크(`<a>`)라서 보조기기와 새 탭 열기가 맞게 동작한다. 모양은 Button 의 primary · secondary 와 같다. */
export const LinkButton = ({
  variant = "secondary",
  size = "sm",
  ...rest
}: Omit<ComponentProps<typeof Link>, "className"> & { variant?: LinkButtonVariant; size?: "sm" | "md" }) => (
  <StyledLinkButton $variant={variant} $size={size} {...rest} />
);
