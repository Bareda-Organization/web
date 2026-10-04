import styled from "@emotion/styled";
import Link from "next/link";

export const StyledRouteDetailLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
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
  margin-bottom: calc(var(--s2) * -1);
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
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s4);

  & > div:first-of-type {
    flex: 1;
  }
`;

export const StyledStatLink = styled(Link)`
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
`;
