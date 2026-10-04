import { StyledCard } from "./Card.styled";

export type CardTone = "base" | "mist" | "outline" | "inverse";
export type CardAccent = "boarded" | "moving" | "missed" | "idle";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** base=흰 카드+그림자 · mist=미스트 배경 블록 · outline=선만 · inverse=그린 블록 */
  tone?: CardTone;
  /** 내부 여백 px. 안 주면 위아래 20 · 좌우 16 */
  padding?: number;
  /** 표를 담는 카드 — 안쪽 여백 없이 위아래 1px 만 두고 넘치는 모서리를 자른다 */
  flush?: boolean;
  /** 상태 강조가 필요할 때 카드 상단 3px 라인. 왼쪽 보더는 쓰지 않습니다 */
  accent?: CardAccent;
};

/** 모든 정보 블록의 기본 껍데기 — 반경 16, 그린 기반 그림자. */
export const Card = ({ tone = "base", padding, flush = false, accent, onClick, children, ...rest }: CardProps) => (
  <StyledCard onClick={onClick} $tone={tone} $padding={padding} $flush={flush} $accent={accent} $clickable={!!onClick} {...rest}>
    {children}
  </StyledCard>
);
