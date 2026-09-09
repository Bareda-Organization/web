import { Icon } from "./Icon";
import { StyledIconButton } from "./IconButton.styled";

export type IconButtonTone = "plain" | "soft" | "inverse";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Lucide 아이콘 이름 */
  icon: string;
  /** 접근성 라벨 (필수) */
  label: string;
  /** plain=툴바·리스트 · soft=미스트 원형 · inverse=크롬(헤더·사이드바) 위 */
  tone?: IconButtonTone;
  /** 버튼 지름 px. 터치 영역은 최소 44 */
  size?: number;
};

/** 아이콘만 있는 원형 버튼 — 헤더 설정/뒤로가기, 리스트 행의 전화 걸기 등. label은 필수입니다. */
export const IconButton = ({ icon, label, tone = "plain", size = 40, ...rest }: IconButtonProps) => (
  <StyledIconButton type="button" aria-label={label} title={label} $tone={tone} $size={size} {...rest}>
    <Icon name={icon} size={Math.round(size * 0.5)} />
  </StyledIconButton>
);
