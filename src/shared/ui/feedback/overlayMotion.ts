import { keyframes } from "@emotion/react";

// 오버레이 등장 움직임 — 가끔 쓰는 요소라 움직임을 준다(시안 kit 12절).
// 뒷막 160ms · 대화상자 200ms(불투명도 + 8px 위에서 .97 크기) · 옆 패널 240ms(오른쪽에서 24px).
// 움직임 줄이기를 켠 사용자에게는 이동·크기를 빼고 불투명도(fadeIn)만 쓴다.
export const scrimIn = keyframes`
  from { opacity: 0; }
`;

export const fadeIn = keyframes`
  from { opacity: 0; }
`;

export const popIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
`;

export const slideIn = keyframes`
  from { opacity: 0; transform: translateX(24px); }
`;
