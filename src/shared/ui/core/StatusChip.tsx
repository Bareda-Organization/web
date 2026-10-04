import type { HTMLAttributes } from "react";
import { StyledMarker, StyledStatusChip } from "./StatusChip.styled";

/**
 * 상태 배지의 의미 — 색 + 글자 + 모양 세 가지로 말한다.
 * end ■ 종료·미등원 · move ▶ 운행 중 · conf ● 확정·정상 · wait ○ 운행 전·대기 · bad ◆ 위험·미승차 · warn ▲ 주의 · info ⓘ 정보 ·
 * ok(정상 글자 칩)·off(꺼짐·대기 글자 칩)은 같은 색에 모양을 줄 수도 뺄 수도 있다. 운행 4색은 의미가 고정이라 다른 뜻으로 재사용하지 않는다.
 */
export type StatusChipTone = "end" | "move" | "conf" | "wait" | "bad" | "warn" | "info" | "ok" | "off";

export type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusChipTone;
  /** 앞쪽 모양(■ ▶ ● ○ ◆ ▲ ⓘ). 글자만 쓰는 칩(예: "확인" · "대기")은 false */
  marker?: boolean;
  /** 면·윤곽 없이 글자(+모양)만 — 표 안의 정상 칩. 예외(미연결·미등록·위험)가 면으로 먼저 보이게 정상은 조용히 둔다 */
  quiet?: boolean;
};

export const StatusChip = ({ tone = "conf", marker = true, quiet = false, children, ...rest }: StatusChipProps) => (
  <StyledStatusChip $tone={tone} $quiet={quiet} data-tone={tone} data-quiet={quiet ? "true" : undefined} {...rest}>
    {marker ? <StyledMarker $tone={tone} aria-hidden="true" /> : null}
    {children}
  </StyledStatusChip>
);

/** 회차 상태 — 서버 값 그대로(idle→confirmed→moving→finished) */
export type RunStatusValue = "idle" | "confirmed" | "moving" | "finished";

const RUN_STATUS: Record<RunStatusValue, { tone: StatusChipTone; label: string }> = {
  idle: { tone: "wait", label: "운행 전" },
  confirmed: { tone: "conf", label: "확정" },
  moving: { tone: "move", label: "운행 중" },
  finished: { tone: "end", label: "종료" },
};

export const RunStatusChip = ({ status, ...rest }: { status: RunStatusValue } & Omit<StatusChipProps, "tone" | "marker" | "children">) => (
  <StatusChip tone={RUN_STATUS[status].tone} {...rest}>
    {RUN_STATUS[status].label}
  </StatusChip>
);

/** 탑승 상태 — 서버 값 그대로. 미등원(absent)은 예정된 결석이라 위험(빨강)이 아니라 끝남 모양의 회색이다(Ruling 811) */
export type BoardingStatusValue = "waiting" | "boarded" | "alighted" | "no_show" | "absent";

const BOARDING_STATUS: Record<BoardingStatusValue, { tone: StatusChipTone; label: string; marker: boolean }> = {
  waiting: { tone: "off", label: "대기", marker: false },
  boarded: { tone: "ok", label: "탑승 완료", marker: true },
  alighted: { tone: "ok", label: "하차 완료", marker: true },
  no_show: { tone: "bad", label: "미승차", marker: true },
  absent: { tone: "off", label: "미등원", marker: true },
};

export const BoardingStatusChip = ({
  status,
  ...rest
}: { status: BoardingStatusValue } & Omit<StatusChipProps, "tone" | "marker" | "children">) => (
  <StatusChip tone={BOARDING_STATUS[status].tone} marker={BOARDING_STATUS[status].marker} {...rest}>
    {BOARDING_STATUS[status].label}
  </StatusChip>
);
