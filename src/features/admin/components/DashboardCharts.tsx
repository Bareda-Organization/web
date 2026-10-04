import { StyledChartSvg } from "./DashboardPage.styled";

// 대시보드의 일별 그래프 — 점이 7개뿐이라 그래프 라이브러리 없이 SVG 로 그린다. 칸마다 축을 따로 둔다(운행 8 · 지연 2 를 한 축에 놓으면 지연이 바닥에 붙는다).
export type DailyPoint = { date: string; value: number };

const monthDay = (date: string): string => {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
};

// 세로 눈금 — 최대값을 위 눈금, 그 절반(올림)을 아래 눈금으로 한다. 최대가 1 이하면 눈금은 1 하나.
const axisTicks = (max: number): number[] => {
  const top = Math.max(max, 1);
  return top <= 1 ? [1] : [Math.ceil(top / 2), top];
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const W = 431;
const H = 118;
const LEFT = 30;
const RIGHT = 375;
const TOP = 24;
const BASE = 98;

export const DailyLineChart = ({ points, name, color }: { points: DailyPoint[]; name: string; color: string }) => {
  const max = Math.max(...points.map((point) => point.value), 1);
  const ticks = axisTicks(max);
  const top = ticks[ticks.length - 1];
  const stepX = points.length > 1 ? (RIGHT - LEFT) / (points.length - 1) : 0;
  const toY = (value: number) => round1(BASE - (value / top) * (BASE - TOP));
  const xy = points.map((point, index) => ({ ...point, x: round1(LEFT + stepX * index), y: toY(point.value) }));
  const last = xy[xy.length - 1];

  return (
    <StyledChartSvg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name} 최근 ${points.length}일`}>
      <line x1={LEFT} x2={RIGHT} y1={BASE} y2={BASE} className="base" />
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={LEFT} x2={RIGHT} y1={toY(tick)} y2={toY(tick)} className="grid" />
          <text x={LEFT - 6} y={toY(tick) + 4} className="ax" textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {xy.map((point) => (
        <text key={point.date} x={point.x} y={H - 4} className="ax" textAnchor="middle">
          {monthDay(point.date)}
        </text>
      ))}
      <polyline points={xy.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {xy.map((point) => (
        <circle key={point.date} cx={point.x} cy={point.y} r="3.6" fill={color} stroke="var(--surface-card)" strokeWidth="2">
          <title>{`${monthDay(point.date)} ${name} ${point.value}`}</title>
        </circle>
      ))}
      {last ? (
        <text x={last.x + 10} y={last.y + 4} className="dl">
          {`${name} ${last.value}`}
        </text>
      ) : null}
    </StyledChartSvg>
  );
};

const BAR_W = 339;
const BAR_H = 104;
const BAR_BASE = 86;
const BAR_TOP = 16;

export const DailyBarChart = ({ points, name, color }: { points: DailyPoint[]; name: string; color: string }) => {
  const max = Math.max(...points.map((point) => point.value), 1);
  const slot = BAR_W / points.length;
  const barWidth = Math.min(27, slot * 0.56);

  return (
    <StyledChartSvg viewBox={`0 0 ${BAR_W} ${BAR_H}`} role="img" aria-label={`${name} 최근 ${points.length}일`}>
      <line x1={0} x2={BAR_W} y1={BAR_BASE} y2={BAR_BASE} className="base" />
      {points.map((point, index) => {
        const center = round1(slot * index + slot / 2);
        const height = round1((point.value / max) * (BAR_BASE - BAR_TOP));
        return (
          <g key={point.date}>
            {point.value > 0 ? (
              <>
                <rect x={round1(center - barWidth / 2)} y={round1(BAR_BASE - height)} width={round1(barWidth)} height={height} rx="3" fill={color}>
                  <title>{`${monthDay(point.date)} ${name} ${point.value}`}</title>
                </rect>
                <text x={center} y={round1(BAR_BASE - height - 4)} className="dl" textAnchor="middle">
                  {point.value}
                </text>
              </>
            ) : null}
            <text x={center} y={BAR_H - 4} className="ax" textAnchor="middle">
              {monthDay(point.date)}
            </text>
          </g>
        );
      })}
    </StyledChartSvg>
  );
};
