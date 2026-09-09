import type { HTMLAttributes } from "react";
import type { Stop } from "../../types";
import { Icon } from "../core/Icon";
import {
  StyledStopTimeline,
  StyledStopTimelineItem,
  StyledStopTimelineRail,
  StyledStopTimelineDot,
  StyledStopTimelineConnector,
  StyledStopTimelineBody,
  StyledStopTimelineHeadline,
  StyledStopTimelineName,
  StyledStopTimelineTime,
  StyledStopTimelineAddress,
  StyledStopTimelineRiders,
  StyledStopTimelineMissed,
} from "./StopTimeline.styled";

export type StopTimelineProps = HTMLAttributes<HTMLOListElement> & {
  stops?: Stop[];
  onSelect?: (stop: Stop, index: number) => void;
  /** 간격 좁게 (관계자 웹 목록) */
  dense?: boolean;
};

const STOP_STATE: Record<string, { dot: string; label: string }> = {
  done: { dot: "var(--status-boarded)", label: "var(--text-secondary)" },
  current: { dot: "var(--status-moving)", label: "var(--text-primary)" },
  next: { dot: "var(--stone-300)", label: "var(--text-primary)" },
  upcoming: { dot: "var(--stone-300)", label: "var(--text-secondary)" },
};

// 정류장 순서 타임라인 — 세 제품 공통. 현재 정류장에 버스 마커가 붙는다.
export const StopTimeline = ({ stops = [], onSelect, dense, ...rest }: StopTimelineProps) => {
  return (
    <StyledStopTimeline {...rest}>
      {stops.map((stop, index) => {
        const state = STOP_STATE[stop.state ?? "upcoming"] ?? STOP_STATE.upcoming;
        const last = index === stops.length - 1;
        const isCurrent = stop.state === "current";
        return (
          <StyledStopTimelineItem
            // 원본은 `key={s.name + i}` 로 인덱스를 섞어 썼다 — 이름·시각·주소로 만든
            // 내용 기반 키로 바꿔 인덱스 의존을 없앤다.
            key={`${stop.name}-${stop.time ?? ""}-${stop.address ?? ""}`}
            $clickable={Boolean(onSelect)}
            onClick={() => onSelect?.(stop, index)}
          >
            <StyledStopTimelineRail>
              <StyledStopTimelineDot $current={isCurrent} $dotColor={state.dot}>
                {isCurrent ? <Icon name="bus" size={13} /> : null}
              </StyledStopTimelineDot>
              {!last ? (
                <StyledStopTimelineConnector $done={stop.state === "done"} $dense={dense} />
              ) : null}
            </StyledStopTimelineRail>
            <StyledStopTimelineBody $last={last} $dense={dense}>
              <StyledStopTimelineHeadline>
                <StyledStopTimelineName $current={isCurrent} $labelColor={state.label}>
                  {stop.name}
                </StyledStopTimelineName>
                {stop.time ? (
                  <StyledStopTimelineTime $current={isCurrent}>{stop.time}</StyledStopTimelineTime>
                ) : null}
              </StyledStopTimelineHeadline>
              {stop.address ? <StyledStopTimelineAddress>{stop.address}</StyledStopTimelineAddress> : null}
              {stop.riders != null ? (
                <StyledStopTimelineRiders>
                  <Icon name="users-round" size={13} />
                  {stop.riders}명
                  {stop.missed ? (
                    <StyledStopTimelineMissed>· 미탑승 {stop.missed}</StyledStopTimelineMissed>
                  ) : null}
                </StyledStopTimelineRiders>
              ) : null}
            </StyledStopTimelineBody>
          </StyledStopTimelineItem>
        );
      })}
    </StyledStopTimeline>
  );
};
