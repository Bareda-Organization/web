import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "../core/Icon";
import {
  StyledStatCard,
  StyledStatCardLabel,
  StyledStatCardValueRow,
  StyledStatCardValue,
  StyledStatCardUnit,
  StyledStatCardSub,
} from "./StatCard.styled";

export type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  value?: ReactNode;
  /** '명', '개' 등 */
  unit?: string;
  /** 숫자 색. missed 는 화면당 한 번만 */
  tone?: "neutral" | "boarded" | "moving" | "missed";
  icon?: string;
  sub?: string;
};

const STAT_TONE: Record<string, string> = {
  neutral: "var(--text-primary)",
  boarded: "var(--status-boarded)",
  moving: "var(--status-moving)",
  missed: "var(--status-missed)",
};

// 숫자 요약 카드 — 관계자 웹 대시보드 상단.
export const StatCard = ({ label, value, unit, tone = "neutral", icon, sub, ...rest }: StatCardProps) => {
  return (
    <StyledStatCard {...rest}>
      <StyledStatCardLabel>
        {icon ? <Icon name={icon} size={14} /> : null}
        {label}
      </StyledStatCardLabel>
      <StyledStatCardValueRow>
        <StyledStatCardValue $color={STAT_TONE[tone] ?? STAT_TONE.neutral}>{value}</StyledStatCardValue>
        {unit ? <StyledStatCardUnit>{unit}</StyledStatCardUnit> : null}
      </StyledStatCardValueRow>
      {sub ? <StyledStatCardSub>{sub}</StyledStatCardSub> : null}
    </StyledStatCard>
  );
};
