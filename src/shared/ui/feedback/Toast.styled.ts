import styled from "@emotion/styled";

// 오른쪽 아래 고정 — 대화상자(50) 위에 뜬다. 연달아 뜰 수 있어 아래에서 위로 쌓인다.
export const StyledToastRegion = styled.div`
  position: fixed;
  right: var(--s5);
  bottom: var(--s5);
  z-index: 60;
  display: grid;
  gap: var(--s2);
  max-width: min(460px, calc(100vw - 48px));
`;

export const StyledToast = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--text-primary);
  color: var(--white);
  border-radius: var(--radius-control);
  padding: 10px 14px;
  font: var(--fw-medium) var(--fs-sm) / 1.45 var(--font-sans);
  opacity: 1;
  transform: none;
  /* 연달아 뜰 수 있는 요소라 keyframes 대신 transition(끊겨도 현재 값에서 이어간다) */
  transition:
    opacity var(--dur-pop) var(--ease-out),
    transform var(--dur-pop) var(--ease-out);

  @starting-style {
    opacity: 0;
    transform: translateY(8px);
  }

  & > svg {
    flex-shrink: 0;
    color: var(--green-200);
  }

  /* 움직임 줄이기 — 이동 없이 불투명도만 */
  @media (prefers-reduced-motion: reduce) {
    transition-property: opacity;
    transform: none;
    @starting-style {
      transform: none;
    }
  }
`;

export const StyledToastText = styled.span`
  display: grid;
  gap: 2px;

  small {
    font: var(--fw-regular) var(--fs-xs) / 1.45 var(--font-sans);
    color: var(--stone-200);
  }
`;

export const StyledToastUndo = styled.button`
  margin-left: var(--s3);
  padding: 0;
  background: none;
  border: 0;
  font: inherit;
  font-weight: var(--fw-bold);
  color: var(--green-200);
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
  cursor: pointer;
  transition: transform var(--dur-press) var(--ease-out);

  &:active {
    transform: scale(0.97);
  }
`;
