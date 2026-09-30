import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "../core/Icon";
import {
  StyledAlertBanner,
  StyledAlertBannerIcon,
  StyledAlertBannerBody,
  StyledAlertBannerTitle,
  StyledAlertBannerContent,
  StyledAlertBannerAction,
} from "./AlertBanner.styled";

export type AlertBannerProps = HTMLAttributes<HTMLDivElement> & {
  /** 상태 컬러 규칙을 그대로 따른다 */
  tone?: "info" | "moving" | "missed" | "boarded";
  title?: string;
  /** 하단 버튼 영역 — 문제 상황이면 다음 행동을 함께 둔다 */
  action?: ReactNode;
};

// 화면 상단 상황 안내 — 지연·미탑승처럼 지금 알아야 하는 사실을 결론부터 쓴다.
// 느낌표와 이모지는 쓰지 않는다.
const ALERT_TONE = {
  info: { foreground: "var(--text-brand)", background: "var(--accent-primary-soft)", icon: "info" },
  moving: { foreground: "var(--status-moving)", background: "var(--status-moving-soft)", icon: "bus" },
  missed: { foreground: "var(--status-missed)", background: "var(--status-missed-soft)", icon: "triangle-alert" },
  boarded: { foreground: "var(--status-boarded)", background: "var(--status-boarded-soft)", icon: "circle-check" },
} as const;

export const AlertBanner = ({ tone = "info", title, children, action, ...rest }: AlertBannerProps) => {
  const toneStyle = ALERT_TONE[tone] ?? ALERT_TONE.info;
  return (
    <StyledAlertBanner $background={toneStyle.background} role={tone === "missed" ? "alert" : "status"} {...rest}>
      <StyledAlertBannerIcon $foreground={toneStyle.foreground}>
        <Icon name={toneStyle.icon} size={18} />
      </StyledAlertBannerIcon>
      <StyledAlertBannerBody>
        {title ? <StyledAlertBannerTitle $foreground={toneStyle.foreground}>{title}</StyledAlertBannerTitle> : null}
        {children ? (
          <StyledAlertBannerContent $hasTitle={Boolean(title)}>{children}</StyledAlertBannerContent>
        ) : null}
        {action ? <StyledAlertBannerAction>{action}</StyledAlertBannerAction> : null}
      </StyledAlertBannerBody>
    </StyledAlertBanner>
  );
};
