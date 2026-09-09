import styled from "@emotion/styled";

// 부트스트랩·리다이렉트 중 화면 — 텍스트도 로고도 없이 배경만 깐다.
// 뭔가를 보여주면 그 자체가 "잠깐 보였다 사라지는" 대상이 되므로 최대한 비워 둔다.
export const StyledGuardFallback = styled.div`
  min-height: 100dvh;
  background: var(--bg-base);
`;
