import { DynamicIcon, type IconName } from "lucide-react/dynamic";

export type IconProps = {
  /** Lucide 아이콘 이름 (kebab-case). 예: 'bus', 'map-pin', 'bell', 'user-round' */
  name: string;
  /** px. 앱 기본 20, 탭바 24, 인라인 16 */
  size?: number;
};

/**
 * 브랜드 전용 아이콘 자산을 제공받지 못해 Lucide(2px stroke, round cap)를 표준으로 씁니다.
 * R19 목표 3.1 — 예전엔 unpkg CDN 에서 SVG 를 받아왔는데(CORS 로 막혀 콘솔 오류) 같은
 * lucide-react 를 번들에서 쓴다. `lucide-react/dynamic` 의 DynamicIcon 은 kebab-case
 * 이름 그대로 아이콘별로 코드 분할해 불러온다 — 기존 name 계약을 그대로 유지하면서
 * 1500여 개 아이콘 전체를 한 번에 번들에 올리지 않는다. 색은 항상 currentColor 를
 * 따릅니다 — fill/stroke 를 직접 넘기지 마세요.
 */
export const Icon = ({ name, size = 20 }: IconProps) => (
  <DynamicIcon name={name as IconName} size={size} color="currentColor" aria-hidden="true" />
);
