import styled from "@emotion/styled";
import type { StatusPillStatus } from "./StatusPill";

type StyledStatusPillProps = {
  $status: StatusPillStatus;
};

// fg/bg 는 --status-<status> · --status-<status>-soft 네이밍을 그대로 따라가므로
// 네 상태를 각각 나열하지 않고 $status 로 직접 조립한다 (Card.styled.ts 의 accent 와 같은 관례).
export const StyledStatusPill = styled.span<StyledStatusPillProps>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: var(--radius-pill);
  background: ${({ $status }) => `var(--status-${$status}-soft)`};
  color: ${({ $status }) => `var(--status-${$status})`};
  font: var(--fw-medium) var(--fs-label-sm) / 1.2 var(--font-sans);
`;

export const StyledDot = styled.span<StyledStatusPillProps>`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${({ $status }) => `var(--status-${$status})`};
`;
