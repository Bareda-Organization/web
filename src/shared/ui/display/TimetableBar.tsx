import type { TimetableRange, TimetableRun } from "../../lib/timetable/timetable";
import { barGeometry, positionPct } from "../../lib/timetable/timetable";
import { StyledNowLine, StyledTimeBar, StyledTimeTrack } from "./TimetableBar.styled";
import type { TimetableBarTone } from "./TimetableBar.styled";

export type TimetableBarProps = {
  run: TimetableRun;
  /** 표 전체가 같이 쓰는 가로축 — `timetableRange` 로 한 번만 구해 모든 행에 준다 */
  range: TimetableRange;
  tone: TimetableBarTone;
  /** 지금 시각(ms) 세로선 — 안 주면(null) 선을 그리지 않는다(오늘이 아닌 날짜의 표) */
  nowMs?: number | null;
};

/** 시간표 막대(시안 `schedule--runs`) — 회차 하나의 출발~도착 구간과 지금 세로선. 장식이라 보조기기에는 읽히지 않는다(시각·상태는 같은 행의 글자가 말한다). */
export const TimetableBar = ({ run, range, tone, nowMs = null }: TimetableBarProps) => {
  const { leftPct, widthPct } = barGeometry(run, range);
  return (
    <StyledTimeTrack aria-hidden="true" data-testid="timetable-track">
      <StyledTimeBar $tone={tone} data-testid="timetable-bar" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
      {nowMs === null ? null : <StyledNowLine data-testid="timetable-now" style={{ left: `${positionPct(nowMs, range)}%` }} />}
    </StyledTimeTrack>
  );
};
