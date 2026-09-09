import type { HTMLAttributes } from "react";
import { Icon } from "../core/Icon";
import { StatusPill } from "../core/StatusPill";
import {
  StyledRunSummaryCard,
  StyledRunSummaryCardHeader,
  StyledRunSummaryCardBusLeg,
  StyledRunSummaryCardEta,
  StyledRunSummaryCardGrid,
  StyledRunSummaryCardCell,
  StyledRunSummaryCardCellLabel,
  StyledRunSummaryCardCellValue,
  StyledRunSummaryCardCrew,
} from "./RunSummaryCard.styled";

export type RunSummaryCardProps = HTMLAttributes<HTMLDivElement> & {
  /** 예: '3-2호차' */
  bus?: string;
  /** 예: '등원' / '하원' */
  leg?: string;
  status?: "boarded" | "moving" | "missed" | "idle";
  statusLabel?: string;
  /** 결론 한 줄. 예: '약 5분 후 도착합니다' */
  eta?: string;
  currentStop?: string;
  nextStop?: string;
  manager?: string;
  driver?: string;
};

// 오늘 운행 요약 — 학부모 앱 홈, 매니저 앱 운행모드 상단.
export const RunSummaryCard = ({
  bus,
  leg,
  status = "moving",
  statusLabel,
  eta,
  currentStop,
  nextStop,
  manager,
  driver,
  onClick,
  ...rest
}: RunSummaryCardProps) => {
  const crew = [driver ? `기사 ${driver}` : null, manager ? `동승 매니저 ${manager}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <StyledRunSummaryCard onClick={onClick} {...rest} $clickable={Boolean(onClick)}>
      <StyledRunSummaryCardHeader>
        <StatusPill status={status}>{statusLabel}</StatusPill>
        <StyledRunSummaryCardBusLeg>
          {bus}
          {leg ? ` · ${leg}` : ""}
        </StyledRunSummaryCardBusLeg>
      </StyledRunSummaryCardHeader>
      {eta ? <StyledRunSummaryCardEta>{eta}</StyledRunSummaryCardEta> : null}
      <StyledRunSummaryCardGrid>
        <StyledRunSummaryCardCell>
          <StyledRunSummaryCardCellLabel>
            <Icon name="navigation" size={13} />
            현재 이동 중
          </StyledRunSummaryCardCellLabel>
          <StyledRunSummaryCardCellValue>{currentStop}</StyledRunSummaryCardCellValue>
        </StyledRunSummaryCardCell>
        <StyledRunSummaryCardCell>
          <StyledRunSummaryCardCellLabel>
            <Icon name="map-pin" size={13} />
            다음 정류장
          </StyledRunSummaryCardCellLabel>
          <StyledRunSummaryCardCellValue>{nextStop}</StyledRunSummaryCardCellValue>
        </StyledRunSummaryCardCell>
      </StyledRunSummaryCardGrid>
      {driver || manager ? <StyledRunSummaryCardCrew>{crew}</StyledRunSummaryCardCrew> : null}
    </StyledRunSummaryCard>
  );
};
