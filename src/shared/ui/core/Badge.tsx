import { StyledBadge } from "./Badge.styled";

export type BadgeTone = "neutral" | "brand" | "amber" | "red" | "added" | "removed";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** added=금일 추가된 탑승자(초록) · removed=삭제된 탑승자(빨강) — 관계자 웹 금일 운행 규칙 */
  tone?: BadgeTone;
  /** 숫자 뱃지 (알림 개수, 미탑승 인원) */
  count?: number;
};

/** 짧은 라벨과 숫자 뱃지 — 상태가 아닌 분류·개수에 씁니다(상태는 StatusPill). */
export const Badge = ({ tone = "neutral", count, children, ...rest }: BadgeProps) => {
  const isCount = count != null;
  return (
    <StyledBadge $tone={tone} $isCount={isCount} {...rest}>
      {isCount ? count : children}
    </StyledBadge>
  );
};
