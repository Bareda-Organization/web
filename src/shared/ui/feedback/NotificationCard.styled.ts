import styled from "@emotion/styled";

export const StyledNotificationCard = styled.div<{ $clickable: boolean }>`
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  cursor: ${(props) => (props.$clickable ? "pointer" : "default")};
  transition: var(--transition-control);
`;

export const StyledNotificationCardBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledNotificationCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const StyledNotificationCardUnreadDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent-secondary);
`;

export const StyledNotificationCardTime = styled.span`
  margin-left: auto;
  font: var(--fw-light) var(--fs-micro) / 1 var(--font-sans);
  color: var(--text-tertiary);
`;

export const StyledNotificationCardTitle = styled.div`
  margin-top: 10px;
  font: var(--fw-bold) 20px / 1.35 var(--font-serif);
  letter-spacing: -0.015em;
`;

export const StyledNotificationCardMeta = styled.div`
  margin-top: 6px;
  font: var(--fw-regular) var(--fs-body-sm) / 1.6 var(--font-sans);
`;

export const StyledNotificationCardSub = styled.div`
  margin-top: 2px;
  font: var(--fw-light) var(--fs-micro) / 1.5 var(--font-sans);
  letter-spacing: var(--ls-micro);
  color: var(--text-secondary);
`;

export const StyledNotificationCardChevron = styled.span`
  color: var(--text-tertiary);
  align-self: center;
`;
