import styled from "@emotion/styled";
import Link from "next/link";

export const StyledRouteDetailLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 맨 위가 빵부스러기라(PageHeader 가 아니라) 위 여백을 여기서 준다 */
  padding: 24px;
`;

export const StyledRouteDetailActions = styled.div`
  display: flex;
  gap: 8px;
`;

// 목록으로 돌아가는 빵부스러기 — 현재 위치는 링크가 아니다.
export const StyledBreadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -36px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);

  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

// 요일 탭(왼쪽) + 방향 전환(오른쪽) 한 줄.
export const StyledRouteDetailTabs = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s4);

  & > div:first-of-type {
    flex: 1;
  }
  /* 방향 전환은 탭 줄 안쪽에 맞춘다 */
  & > div:last-of-type {
    margin-top: 8px;
  }
`;

export const StyledStatLink = styled(Link)`
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
`;
