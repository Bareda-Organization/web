import styled from "@emotion/styled";

export type TimetableBarTone = "idle" | "confirmed" | "moving" | "finished" | "canceled";

export const StyledTimeTrack = styled.span`
  position: relative;
  display: block;
  min-width: 150px;
  height: 18px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    margin-top: -1px;
    background: var(--border-subtle);
  }
`;

export const StyledTimeBar = styled.span<{ $tone: TimetableBarTone }>`
  position: absolute;
  top: 3px;
  height: 12px;
  border-radius: 3px;
  background: ${({ $tone }) =>
    $tone === "finished"
      ? "var(--c-end)"
      : $tone === "moving"
        ? "var(--c-move)"
        : $tone === "confirmed"
          ? "var(--c-conf)"
          : $tone === "canceled"
            ? "var(--border-default)"
            : "var(--green-300)"};
`;

export const StyledNowLine = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--text-primary);
`;
