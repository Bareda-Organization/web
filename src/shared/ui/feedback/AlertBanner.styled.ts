import styled from "@emotion/styled";

export const StyledAlertBanner = styled.div<{ $background: string }>`
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: ${(props) => props.$background};
  border-radius: var(--radius-md);
`;

export const StyledAlertBannerIcon = styled.span<{ $foreground: string }>`
  color: ${(props) => props.$foreground};
  margin-top: 2px;
`;

export const StyledAlertBannerBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledAlertBannerTitle = styled.div<{ $foreground: string }>`
  font: var(--fw-bold) var(--fs-body-sm) / 1.4 var(--font-sans);
  color: ${(props) => props.$foreground};
`;

export const StyledAlertBannerContent = styled.div<{ $hasTitle: boolean }>`
  margin-top: ${(props) => (props.$hasTitle ? "4px" : "0")};
  font: var(--fw-regular) var(--fs-body-sm) / 1.6 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledAlertBannerAction = styled.div`
  margin-top: 10px;
  /* 버튼이 둘 이상이면 붙어 보인다 — 학원별 요약 띠가 여러 학원 버튼을 나란히 둔다 */
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
