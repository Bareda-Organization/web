import type { HTMLAttributes, ReactNode } from "react";
import {
  StyledPageHeader,
  StyledPageHeaderRow,
  StyledPageHeaderBody,
  StyledPageHeaderTitle,
  StyledPageHeaderDescription,
  StyledPageHeaderActions,
  StyledPageHeaderTabs,
} from "./PageHeader.styled";

export type PageHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: string;
  /** 오른쪽 주요 버튼들 */
  actions?: ReactNode;
  /** 하단 탭 영역 (SegmentedControl 또는 커스텀) */
  tabs?: ReactNode;
};

// 데스크톱 페이지 상단 — 제목 + 설명 + 액션 + 탭.
export const PageHeader = ({ title, description, actions, tabs, ...rest }: PageHeaderProps) => {
  return (
    <StyledPageHeader {...rest}>
      <StyledPageHeaderRow>
        <StyledPageHeaderBody>
          <StyledPageHeaderTitle>{title}</StyledPageHeaderTitle>
          {description ? <StyledPageHeaderDescription>{description}</StyledPageHeaderDescription> : null}
        </StyledPageHeaderBody>
        {actions ? <StyledPageHeaderActions>{actions}</StyledPageHeaderActions> : null}
      </StyledPageHeaderRow>
      {tabs ? <StyledPageHeaderTabs>{tabs}</StyledPageHeaderTabs> : null}
    </StyledPageHeader>
  );
};
