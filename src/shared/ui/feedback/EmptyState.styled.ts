import styled from "@emotion/styled";

type Tone = "neutral" | "bad" | "warn";

const ICON_TONE: Record<Tone, { background: string; color: string }> = {
  neutral: { background: "var(--surface-fill)", color: "var(--text-secondary)" },
  bad: { background: "var(--status-missed-soft)", color: "var(--t-bad)" },
  warn: { background: "var(--amber-100)", color: "var(--t-move)" },
};

export const StyledEmptyState = styled.div<{ $slim: boolean }>`
  ${({ $slim }) =>
    $slim
      ? `
    display: flex;
    align-items: center;
    gap: var(--s4);
    text-align: left;
    padding: var(--s4) var(--s5);
  `
      : `
    text-align: center;
    padding: var(--s6) var(--s4);
  `}
`;

export const StyledEmptyStateIcon = styled.span<{ $tone: Tone }>`
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: ${({ $tone }) => ICON_TONE[$tone].background};
  color: ${({ $tone }) => ICON_TONE[$tone].color};
`;

// 한 줄 판에서는 아이콘 옆에 글이 놓이고, 기본 판에서는 아이콘 아래에 가운데 정렬로 쌓인다.
export const StyledEmptyStateText = styled.div`
  min-width: 0;
`;

export const StyledEmptyStateTitle = styled.div<{ $slim: boolean }>`
  margin-top: ${({ $slim }) => ($slim ? 0 : "10px")};
  font: var(--fw-bold) ${({ $slim }) => ($slim ? "var(--fs-md)" : "var(--fs-lg)")} / 1.4 var(--font-serif);
`;

export const StyledEmptyStateBody = styled.div<{ $slim: boolean }>`
  margin: ${({ $slim }) => ($slim ? "2px 0 0" : "6px auto 0")};
  max-width: ${({ $slim }) => ($slim ? "none" : "46ch")};
  font: var(--fw-regular) var(--fs-sm) / 1.6 var(--font-sans);
  color: var(--text-secondary);
  text-wrap: pretty;
`;

export const StyledEmptyStateAction = styled.div<{ $slim: boolean }>`
  margin-top: var(--s4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
  justify-content: ${({ $slim }) => ($slim ? "flex-start" : "center")};
`;
