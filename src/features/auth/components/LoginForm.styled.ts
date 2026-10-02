import styled from "@emotion/styled";
import Link from "next/link";

// div 위계 — Layout(화면 전체) → Container(카드 폭 고정) → Wrapper(안쪽 배치) → Style
// (`docs/frontend/web/CONVENTIONS_REACT.md` "스타일"). 로그인·가입·대기 화면 3개가 같은 위계를 쓴다.
export const StyledLayout = styled.div`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: var(--gutter-desktop);
`;

export const StyledContainer = styled.div`
  width: 100%;
  max-width: 400px;
`;

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
`;

export const StyledBrand = styled.p`
  font: var(--text-h3);
  color: var(--text-brand);
  text-align: center;
  margin: 0;
`;

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

export const StyledFooter = styled.p`
  font: var(--text-body);
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
`;

// next/link 를 직접 스타일링한다 — `as={Link}` 다형성 대신 이쪽이 타입이 그대로 붙는다.
export const StyledLink = styled(Link)`
  color: var(--text-link);
  text-decoration: none;
  font-weight: var(--fw-medium);

  &:hover {
    color: var(--text-link-hover);
    text-decoration: underline;
  }
`;
