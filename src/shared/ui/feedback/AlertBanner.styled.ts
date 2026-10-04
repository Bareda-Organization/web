import styled from "@emotion/styled";
import { css } from "@emotion/react";

type Tone = "info" | "moving" | "missed" | "boarded";

// 면 · 둘레선 · 글자 세 값이 한 벌 — 글자는 연한 면 위 4.5:1 이 나오는 어두운 단계(--t-*)
const toneStyle: Record<Tone, ReturnType<typeof css>> = {
  moving: css`
    background: var(--amber-100);
    border-color: var(--amber-300);
    color: var(--t-move);
  `,
  missed: css`
    background: var(--red-100);
    border-color: color-mix(in srgb, var(--red-ink) 28%, var(--white));
    color: var(--t-bad);
  `,
  boarded: css`
    background: var(--green-100);
    border-color: var(--green-200);
    color: var(--green-600);
  `,
  info: css`
    background: var(--b-info);
    border-color: color-mix(in srgb, var(--t-info) 25%, var(--white));
    color: var(--t-info);
  `,
};

export const StyledAlertBanner = styled.div<{ $tone: Tone }>`
  display: flex;
  align-items: flex-start;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  border: 1px solid;
  border-radius: var(--radius-md);
  font: var(--fw-regular) var(--fs-md) / 1.5 var(--font-sans);
  ${({ $tone }) => toneStyle[$tone]}
`;

export const StyledAlertBannerIcon = styled.span`
  flex-shrink: 0;
  margin-top: 2px;
`;

export const StyledAlertBannerBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledAlertBannerTitle = styled.div`
  font-weight: var(--fw-bold);
`;

export const StyledAlertBannerContent = styled.div<{ $hasTitle: boolean }>`
  margin-top: ${(props) => (props.$hasTitle ? "2px" : "0")};
  font-size: var(--fs-sm);
  color: var(--text-primary);
  text-wrap: pretty;
`;

// 버튼이 많아져도(미승차 학생 5명의 보호자 전화 버튼 5개) 글 칸이 짜부라지지 않게 버튼 칸은 최대 45% 에서 줄바꿈한다.
export const StyledAlertBannerAction = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  gap: var(--s2);
  max-width: min(520px, 45%);
  margin-left: auto;
`;
