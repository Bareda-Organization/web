import type { HTMLAttributes, ReactNode } from "react";
import styled from "@emotion/styled";

const StyledConnectionBand = styled.div`
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

  & > :last-child:not(b):not(span) {
    margin-left: auto;
  }

  @starting-style {
    opacity: 0;
  }
  transition: opacity var(--dur-pop) var(--ease-out);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * 실시간 연결 끊김 한 줄 띠(시안 `.conn`) — 앰버 바탕 한 줄에 제목(굵게) · 설명 · 오른쪽 단추. 빨강 상자가 아니라 "지금 화면의 값이 실시간이 아닐 수 있다" 는 주의라서다.
 * 나타날 때 투명도만 바꾼다(밀림은 한 줄 띠 그대로).
 */
export const ConnectionBand = ({ title, children, action, ...rest }: Omit<HTMLAttributes<HTMLDivElement>, "title"> & { title: string; children?: ReactNode; action?: ReactNode }) => (
  <StyledConnectionBand role="status" data-realtime-band {...rest}>
    <b>{title}</b>
    {children ? <span>{children}</span> : null}
    {action}
  </StyledConnectionBand>
);
