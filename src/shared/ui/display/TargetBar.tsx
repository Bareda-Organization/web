export type TargetBarProps = {
  /** 0~1 — 달성한 비율 */
  value: number;
  /** 0~1 — 목표 눈금(세로선) 위치 */
  target: number;
  /** 보조기기에 읽힐 이름 */
  label: string;
  /** 막대 색 — 목표를 넘기면 정상(conf), 못 미치면 주의(move) */
  tone?: "conf" | "move";
};

const WIDTH = 96;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** 목표선 막대(kit 6절) — 정시 출발률처럼 "목표 대비 어디쯤"을 보이는 한 줄 막대. 세로선이 목표다. */
export const TargetBar = ({ value, target, label, tone = "conf" }: TargetBarProps) => (
  <svg viewBox={`0 0 ${WIDTH} 30`} width={WIDTH} height={30} role="img" aria-label={label}>
    <rect x="0" y="11" width={WIDTH} height="8" rx="4" fill="var(--surface-fill)" />
    <rect x="0" y="11" width={Math.round(WIDTH * clamp01(value) * 10) / 10} height="8" rx="4" fill={`var(--c-${tone})`} />
    <line x1={Math.round(WIDTH * clamp01(target) * 10) / 10} x2={Math.round(WIDTH * clamp01(target) * 10) / 10} y1="5" y2="25" stroke="var(--text-primary)" strokeWidth="2" />
  </svg>
);
