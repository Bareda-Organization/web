import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "../core/Icon";
import {
  StyledEmptyState,
  StyledEmptyStateIcon,
  StyledEmptyStateTitle,
  StyledEmptyStateBody,
  StyledEmptyStateAction,
} from "./EmptyState.styled";

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  /** Lucide 아이콘 이름 */
  icon?: string;
  title?: string;
  action?: ReactNode;
};

// 비어 있는 목록 — 운행 전 시간대, 알림 없음, 검색 결과 없음.
export const EmptyState = ({ icon = "bus", title, children, action, ...rest }: EmptyStateProps) => {
  return (
    <StyledEmptyState {...rest}>
      <StyledEmptyStateIcon>
        <Icon name={icon} size={26} />
      </StyledEmptyStateIcon>
      <StyledEmptyStateTitle>{title}</StyledEmptyStateTitle>
      {children ? <StyledEmptyStateBody>{children}</StyledEmptyStateBody> : null}
      {action ? <StyledEmptyStateAction>{action}</StyledEmptyStateAction> : null}
    </StyledEmptyState>
  );
};
