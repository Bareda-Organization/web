import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "../core/Icon";
import {
  StyledEmptyState,
  StyledEmptyStateIcon,
  StyledEmptyStateText,
  StyledEmptyStateTitle,
  StyledEmptyStateBody,
  StyledEmptyStateAction,
} from "./EmptyState.styled";

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  /** Lucide 아이콘 이름 */
  icon?: string;
  title?: string;
  action?: ReactNode;
  /** 아래에 이어서 볼 내용(대기 목록 등)이 있을 때 한 줄 높이로 압축한다. 빈 상태가 화면의 전부일 때는 쓰지 않는다 */
  slim?: boolean;
  /** 처음부터 못 받았을 때의 오류 상태 — bad=불러오지 못함 · warn=주의. 원인 한 문장 + 다시 시도 + 다른 길을 함께 둔다 */
  tone?: "neutral" | "bad" | "warn";
};

// 비어 있는 목록 — 운행 전 시간대, 알림 없음, 검색 결과 없음. 원인과 다음 동작을 한 문장씩 쓴다.
export const EmptyState = ({ icon = "bus", title, children, action, slim = false, tone = "neutral", ...rest }: EmptyStateProps) => {
  return (
    <StyledEmptyState $slim={slim} {...rest}>
      <StyledEmptyStateIcon $tone={tone}>
        <Icon name={icon} size={22} />
      </StyledEmptyStateIcon>
      <StyledEmptyStateText>
        <StyledEmptyStateTitle $slim={slim}>{title}</StyledEmptyStateTitle>
        {children ? <StyledEmptyStateBody $slim={slim}>{children}</StyledEmptyStateBody> : null}
        {action ? <StyledEmptyStateAction $slim={slim}>{action}</StyledEmptyStateAction> : null}
      </StyledEmptyStateText>
    </StyledEmptyState>
  );
};
