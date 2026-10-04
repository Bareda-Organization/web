export type SparklineTone = "conf" | "move" | "bad";

export type SparklineProps = {
  /** 오래된 값 → 최근 값 순서. 2개 이상 */
  values: number[];
  /** 의미색 — conf 정상 · move 지연 · bad 위험. 같은 지표는 늘 같은 색 */
  tone?: SparklineTone;
  /** 보조기기에 읽힐 이름 */
  label: string;
};

const WIDTH = 96;
const HEIGHT = 30;
const PAD_X = 4;
const PAD_Y = 4;

const round1 = (value: number) => Math.round(value * 10) / 10;

// 지표 칸의 작은 추이선(96×30) — 면 + 선 + 마지막 점. 축·눈금은 없다(칸마다 축을 따로 두므로 값 비교용이 아니라 모양 확인용).
export const Sparkline = ({ values, tone = "conf", label }: SparklineProps) => {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const stepX = (WIDTH - PAD_X * 2) / (values.length - 1);
  // 값이 모두 같으면 한가운데 가로선으로 그린다.
  const toY = (value: number) => (range === 0 ? HEIGHT / 2 : round1(HEIGHT - PAD_Y - ((value - min) / range) * (HEIGHT - PAD_Y * 2)));
  const points = values.map((value, index) => ({ x: round1(PAD_X + stepX * index), y: toY(value) }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const last = points[points.length - 1];
  const color = `var(--c-${tone})`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label={label}>
      <polygon points={`${PAD_X},${HEIGHT - PAD_Y} ${line} ${last.x},${HEIGHT - PAD_Y}`} fill={color} opacity=".14" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3" fill={color} />
    </svg>
  );
};
