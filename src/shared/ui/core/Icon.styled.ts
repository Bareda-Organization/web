import styled from "@emotion/styled";

type StyledIconProps = {
  $url: string;
  $size: number;
};

// mask-image 는 currentColor 로 채우기 위한 방식이라 background-image 가 아니라 mask 로 그린다
// (Icon.jsx 원본 주석 — 색은 항상 부모의 color 를 상속한다).
export const StyledIcon = styled.span<StyledIconProps>`
  display: inline-block;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: none;
  background: currentColor;
  -webkit-mask-image: url(${({ $url }) => $url});
  mask-image: url(${({ $url }) => $url});
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
`;
