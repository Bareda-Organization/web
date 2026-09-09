import styled from "@emotion/styled";

export const StyledStopTimeline = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const StyledStopTimelineItem = styled.li<{ $clickable: boolean }>`
  display: flex;
  gap: 14px;
  cursor: ${(props) => (props.$clickable ? "pointer" : undefined)};
`;

export const StyledStopTimelineRail = styled.div`
  width: 24px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const StyledStopTimelineDot = styled.span<{ $current: boolean; $dotColor: string }>`
  width: ${(props) => (props.$current ? 24 : 12)}px;
  height: ${(props) => (props.$current ? 24 : 12)}px;
  margin-top: 4px;
  border-radius: 999px;
  background: ${(props) => (props.$current ? "var(--status-moving)" : props.$dotColor)};
  display: grid;
  place-items: center;
  color: var(--white);
  flex: none;
  box-shadow: ${(props) => (props.$current ? "0 0 0 4px var(--status-moving-soft)" : "none")};
`;

export const StyledStopTimelineConnector = styled.span<{ $done: boolean; $dense?: boolean }>`
  flex: 1;
  width: 2px;
  background: ${(props) => (props.$done ? "var(--status-boarded)" : "var(--stone-200)")};
  min-height: ${(props) => (props.$dense ? 18 : 26)}px;
`;

export const StyledStopTimelineBody = styled.div<{ $last: boolean; $dense?: boolean }>`
  flex: 1;
  min-width: 0;
  padding-bottom: ${(props) => (props.$last ? 0 : props.$dense ? 12 : 18)}px;
`;

export const StyledStopTimelineHeadline = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

export const StyledStopTimelineName = styled.span<{ $current: boolean; $labelColor: string }>`
  font: ${(props) => (props.$current ? "var(--fw-bold)" : "var(--fw-medium)")} var(--fs-body-sm) / 1.4 var(--font-sans);
  color: ${(props) => props.$labelColor};
`;

export const StyledStopTimelineTime = styled.span<{ $current: boolean }>`
  margin-left: auto;
  font: var(--fw-bold) var(--fs-micro) / 1 var(--font-sans);
  font-variant-numeric: tabular-nums;
  color: ${(props) => (props.$current ? "var(--status-moving)" : "var(--text-tertiary)")};
`;

export const StyledStopTimelineAddress = styled.div`
  margin-top: 2px;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: var(--text-tertiary);
`;

export const StyledStopTimelineRiders = styled.div`
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font: var(--fw-regular) var(--fs-micro) / 1 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledStopTimelineMissed = styled.span`
  color: var(--status-missed);
  font-weight: var(--fw-bold);
`;
