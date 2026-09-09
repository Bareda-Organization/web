import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "../core/Icon";
import {
  StyledAppHeader,
  StyledAppHeaderBack,
  StyledAppHeaderBackSpacer,
  StyledAppHeaderBody,
  StyledAppHeaderTitle,
  StyledAppHeaderSubtitle,
  StyledAppHeaderActions,
} from "./AppHeader.styled";

export type AppHeaderProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  /** 호차·매니저 등 메타 한 줄 */
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  /** 오른쪽 IconButton 들 */
  actions?: ReactNode;
  /** brand=크롬 면(오프화이트 + 하단 선, 다크에선 딥) · plain=본문과 같은 바탕 */
  tone?: "brand" | "plain";
};

// 앱 상단 바 — 홈은 brand(그린), 설정·상세는 plain 을 쓴다.
export const AppHeader = ({ title, subtitle, back, onBack, actions, tone = "brand", ...rest }: AppHeaderProps) => {
  const inverse = tone === "brand";
  return (
    <StyledAppHeader $inverse={inverse} {...rest}>
      {back ? (
        <StyledAppHeaderBack type="button" onClick={onBack} aria-label="뒤로">
          <Icon name="chevron-left" size={22} />
        </StyledAppHeaderBack>
      ) : (
        <StyledAppHeaderBackSpacer />
      )}
      <StyledAppHeaderBody>
        <StyledAppHeaderTitle>{title}</StyledAppHeaderTitle>
        {subtitle ? <StyledAppHeaderSubtitle $inverse={inverse}>{subtitle}</StyledAppHeaderSubtitle> : null}
      </StyledAppHeaderBody>
      <StyledAppHeaderActions>{actions}</StyledAppHeaderActions>
    </StyledAppHeader>
  );
};
