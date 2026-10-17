import styled from "@emotion/styled";

// 비상 알림 띠(`StyledEmergencyPopupStack`)와 같은 좌우 여백 — 둘이 위아래로 놓일 때 폭이 어긋나지 않게 한다.
export const StyledRealtimeConnectionStrip = styled.div`
  padding: 12px 24px 0;
`;

// 앰버 바탕 한 줄에 제목(굵게) · 설명. 빨강 상자가 아니라 "지금 화면의 값이 실시간이 아닐 수 있다" 는 주의라서다.
// 나타날 때 투명도만 바꾼다(밀림은 한 줄 띠 그대로).
export const StyledConnectionBand = styled.div`
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s4);
  border-radius: var(--radius-control);
  border: 1px solid var(--amber-300);
  background: var(--amber-100);
  color: var(--t-move);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);

  b {
    font-weight: var(--fw-bold);
  }

  @starting-style {
    opacity: 0;
  }
  transition: opacity var(--dur-pop) var(--ease-out);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
