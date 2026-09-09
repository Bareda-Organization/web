import { Icon } from "./Icon";
import { StyledButton } from "./Button.styled";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary=주요 행동(그린/다크에선 앰버) · secondary=보조 · soft=미스트 배경 · ghost=텍스트만 · danger=미탑승·삭제 */
  variant?: ButtonVariant;
  /** sm 36 · md 44 · lg 52 (앱 주요 버튼은 lg) */
  size?: ButtonSize;
  /** 앞쪽 Lucide 아이콘 이름 */
  icon?: string;
  /** 뒤쪽 Lucide 아이콘 이름 */
  iconEnd?: string;
  /** 가로 100% */
  block?: boolean;
};

/**
 * 바래다 기본 버튼. 한 화면에 primary는 하나만, danger는 미탑승 처리·삭제 확정에만 씁니다.
 */
export const Button = ({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  block,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) => {
  const iconSize = size === "sm" ? 16 : 18;
  return (
    <StyledButton
      type={type}
      disabled={disabled}
      $variant={variant}
      $size={size}
      $block={!!block}
      {...rest}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={iconSize} /> : null}
    </StyledButton>
  );
};
