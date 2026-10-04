import styled from "@emotion/styled";
import { fadeIn, popIn, scrimIn } from "./overlayMotion";

// z-index: 옆 패널(40) 위에 확인 대화상자(50)가 쌓이고, 그 위에 처리 결과 알림(토스트 60)이 뜬다.
export const StyledDialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: var(--overlay-scrim);
  display: grid;
  padding: var(--s5);
  z-index: 50;
  overflow-y: auto;
  animation: ${scrimIn} var(--dur-ui) var(--ease-out);
`;

export const StyledDialogPanel = styled.div<{ $width: number }>`
  width: 100%;
  max-width: ${(props) => props.$width}px;
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-raised);
  outline: none;
  /* 화면보다 큰 패널은 위쪽이 잘리지 않고 오버레이 안에서 스크롤된다 */
  margin: auto;
  animation: ${popIn} var(--dur-pop) var(--ease-out);

  @media (prefers-reduced-motion: reduce) {
    animation-name: ${fadeIn};
  }
`;

export const StyledDialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: var(--s4) 20px var(--s2);
`;

export const StyledDialogTitle = styled.div`
  font: var(--fw-bold) var(--fs-lg) / 1.35 var(--font-serif);
  letter-spacing: -0.015em;
  text-wrap: balance;
`;

export const StyledDialogBody = styled.div<{ $hasHeader: boolean }>`
  padding: ${(props) => (props.$hasHeader ? "4px 20px 20px" : "20px")};
  font: var(--fw-regular) var(--fs-md) / 1.6 var(--font-sans);
  color: var(--text-secondary);
  text-wrap: pretty;
`;

// 꺼진 실행 버튼의 이유 글 — 입력칸 바로 아래에 붙어 읽힌다.
export const StyledDialogActionHint = styled.div`
  margin-top: var(--s1);
  font: var(--fw-regular) var(--fs-xs) / 1.5 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledDialogFooter = styled.div`
  display: flex;
  gap: var(--s2);
  justify-content: flex-end;
  padding: var(--s3) 20px;
  border-top: 1px solid var(--border-subtle);
`;
