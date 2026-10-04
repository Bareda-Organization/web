import { Icon } from "./Icon";
import { StyledButton } from "./Button.styled";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "dangerQuiet" | "ghostDanger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * primary=주요 행동(딥그린, 한 화면에 하나) · secondary=보조 · soft=미스트 배경 · ghost=텍스트만 ·
   * danger=빨강 면(확인 대화상자의 실행 버튼만) · dangerQuiet=빨강 선(목록·상세의 1단계 파괴 동작) ·
   * ghostDanger=빨강 글자(표 행마다 반복되는 위험 동작)
   */
  variant?: ButtonVariant;
  /** sm 28 · md 36 · lg 44 */
  size?: ButtonSize;
  /** 앞쪽 Lucide 아이콘 이름 */
  icon?: string;
  /** 뒤쪽 Lucide 아이콘 이름 */
  iconEnd?: string;
  /** 가로 100% */
  block?: boolean;
  /** 글자 없이 아이콘만(정사각형). 접근 이름은 `aria-label` 로 직접 준다 */
  iconOnly?: boolean;
};

/**
 * 바래다 기본 버튼. 한 화면에 primary는 하나만, 빨강 면(danger)은 되돌릴 수 없는 동작의 확인 대화상자 실행 버튼에만 씁니다.
 */
export const Button = ({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  block,
  iconOnly,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) => {
  const iconSize = size === "lg" ? 18 : 16;
  return (
    <StyledButton
      type={type}
      disabled={disabled}
      $variant={variant}
      $size={size}
      $block={!!block}
      $iconOnly={!!iconOnly}
      {...rest}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={iconSize} /> : null}
    </StyledButton>
  );
};
