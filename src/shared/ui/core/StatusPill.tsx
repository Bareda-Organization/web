import { Icon } from "./Icon";
import { StyledDot, StyledStatusPill } from "./StatusPill.styled";

export type StatusPillStatus = "boarded" | "moving" | "missed" | "idle";

export type StatusPillProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** boarded=승차 완료·정상 운행 · moving=이동 중·지연 · missed=미탑승·긴급 · idle=운행 전·종료 */
  status?: StatusPillStatus;
  /** 아이콘 대신 점 하나 (밀집 리스트용) */
  dot?: boolean;
  /** 아이콘 숨기기 */
  showIcon?: boolean;
};

const statusMeta: Record<StatusPillStatus, { icon: string; label: string }> = {
  boarded: { icon: "circle-check", label: "승차 완료" },
  moving: { icon: "bus", label: "이동 중" },
  missed: { icon: "circle-alert", label: "미탑승" },
  idle: { icon: "clock", label: "운행 전" },
};

/**
 * 운행 상태 표시 — 세 제품에서 같은 상태는 항상 같은 색. 상태-색 매핑이 고정돼 있으니
 * 직접 색을 지정하지 마세요. missed는 한 화면에 한 번만 노출합니다.
 */
export const StatusPill = ({ status = "boarded", children, dot, showIcon = true, ...rest }: StatusPillProps) => {
  const meta = statusMeta[status];
  return (
    <StyledStatusPill $status={status} {...rest}>
      {dot ? <StyledDot $status={status} /> : null}
      {!dot && showIcon ? <Icon name={meta.icon} size={14} /> : null}
      {children || meta.label}
    </StyledStatusPill>
  );
};
