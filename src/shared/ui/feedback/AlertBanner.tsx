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
  /** moving=주의(앰버 면) · missed=위험 · boarded=정상 · info=정보(보라) — 의미색 4종 */
  tone?: "info" | "moving" | "missed" | "boarded";
  title?: string;
  /** 오른쪽 버튼 칸 — 문제 상황이면 다음 행동을 함께 둔다. 버튼이 많아도 칸 안에서 줄바꿈된다 */
  action?: ReactNode;
};

// 화면 상단 상황 안내 — 지연·미승차처럼 지금 알아야 하는 사실을 결론부터 쓴다.
// 느낌표와 이모지는 쓰지 않는다. 색만으로 말하지 않게 톤마다 아이콘이 다르다(주의·위험은 삼각형).
const ALERT_TONE = {
  info: { icon: "info" },
  moving: { icon: "triangle-alert" },
  missed: { icon: "triangle-alert" },
  boarded: { icon: "circle-check" },
} as const;

export const AlertBanner = ({ tone = "info", title, children, action, ...rest }: AlertBannerProps) => {
  const toneStyle = ALERT_TONE[tone] ?? ALERT_TONE.info;
  return (
    <StyledAlertBanner $tone={tone} role={tone === "missed" ? "alert" : "status"} {...rest}>
      <StyledAlertBannerIcon>
        <Icon name={toneStyle.icon} size={16} />
      </StyledAlertBannerIcon>
      <StyledAlertBannerBody>
        {title ? <StyledAlertBannerTitle>{title}</StyledAlertBannerTitle> : null}
        {children ? <StyledAlertBannerContent $hasTitle={Boolean(title)}>{children}</StyledAlertBannerContent> : null}
      </StyledAlertBannerBody>
      {action ? <StyledAlertBannerAction>{action}</StyledAlertBannerAction> : null}
    </StyledAlertBanner>
  );
};
