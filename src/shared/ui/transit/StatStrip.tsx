import type { HTMLAttributes, ReactNode } from "react";
import { Sparkline } from "./Sparkline";
import type { SparklineTone } from "./Sparkline";
import { StyledStatStrip, StyledStatCell, StyledStatLabel, StyledStatValue, StyledStatDetail } from "./StatStrip.styled";

export type StatStripItem = {
  label: string;
  value: ReactNode;
  /** 값 옆의 작은 단위 — '회' · '건' · '%' */
  unit?: string;
  /** 값 색 — bad(빨강) 는 위험 지표만, warn(앰버) 은 주의. 값이 0 이면 자동으로 보조색으로 낮아진다 */
  tone?: "neutral" | "warn" | "bad";
  /** 보조 두 줄 — 직전 대비 · 맥락. 줄바꿈은 `<br />` 이나 배열로 */
  detail?: ReactNode;
  /** 작은 추이선 */
  trend?: { values: number[]; tone?: SparklineTone; label?: string };
};

export type StatStripProps = HTMLAttributes<HTMLDivElement> & {
  items: StatStripItem[];
};

/**
 * 지표 칸 — 한 카드 안에 4~6칸을 한 줄로 늘어놓는다. 칸마다 값(32/700) + 보조 두 줄 + 작은 추이선.
 * 위험 지표만 값이 빨강이어야 위험이 한눈에 보인다.
 */
export const StatStrip = ({ items, ...rest }: StatStripProps) => (
  <StyledStatStrip $count={items.length} {...rest}>
    {items.map((item) => {
      const tone = item.value === 0 && (item.tone ?? "neutral") === "neutral" ? "zero" : (item.tone ?? "neutral");
      return (
        <StyledStatCell key={item.label}>
          <StyledStatLabel>{item.label}</StyledStatLabel>
          <StyledStatValue $tone={tone}>
            {item.value}
            {item.unit ? <small>{item.unit}</small> : null}
          </StyledStatValue>
          {item.detail ? <StyledStatDetail>{item.detail}</StyledStatDetail> : null}
          {item.trend ? <Sparkline values={item.trend.values} tone={item.trend.tone} label={item.trend.label ?? item.label} /> : null}
        </StyledStatCell>
      );
    })}
  </StyledStatStrip>
);
