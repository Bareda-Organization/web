import { StyledIcon } from "./Icon.styled";

export type IconProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** Lucide 아이콘 이름 (kebab-case). 예: 'bus', 'map-pin', 'bell', 'user-round' */
  name: string;
  /** px. 앱 기본 20, 탭바 24, 인라인 16 */
  size?: number;
};

const LUCIDE_BASE = "https://unpkg.com/lucide-static@0.428.0/icons/";

/**
 * 브랜드 전용 아이콘 자산을 제공받지 못해 Lucide(2px stroke, round cap)를 표준으로 씁니다.
 * CSS mask로 그려서 색은 항상 currentColor를 따릅니다 — fill/stroke를 직접 넘기지 마세요.
 */
export const Icon = ({ name, size = 20, ...rest }: IconProps) => {
  const url = `${LUCIDE_BASE}${name}.svg`;
  return <StyledIcon aria-hidden="true" $url={url} $size={size} {...rest} />;
};
