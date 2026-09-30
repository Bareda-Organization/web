import styled from "@emotion/styled";

export const MAIN_CONTENT_ID = "main-content";

// 화면에 보이지 않다가 키보드 초점이 오면 나타나는 "본문 바로가기" — 사이드바 메뉴 10여 개를 Tab 으로 지나지 않고 본문으로 간다(B1 #22).
const StyledSkipLink = styled.a`
  position: absolute;
  left: 8px;
  top: -100px;
  z-index: 100;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-card);
  color: var(--text-primary);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-bold);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);

  &:focus {
    top: 8px;
  }
`;

export const SkipLink = () => <StyledSkipLink href={`#${MAIN_CONTENT_ID}`}>본문 바로가기</StyledSkipLink>;
