import type { SegmentedOption } from "./types";
import { StyledTab, StyledTabs } from "./SegmentedControl.styled";

export type SegmentedControlProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
  options?: Array<string | SegmentedOption>;
  value?: string;
  onChange?: (value: string) => void;
  block?: boolean;
};

/** 2–3개 배타 선택 — 로그인 유저 타입(학생/학부모), 등원/미등원, 등원/하원 노선 전환. */
export const SegmentedControl = ({ options = [], value, onChange, block, ...rest }: SegmentedControlProps) => (
  <StyledTabs role="tablist" $block={!!block} {...rest}>
    {options.map((option) => {
      const normalized = typeof option === "string" ? { value: option, label: option } : option;
      const selected = normalized.value === value;
      return (
        <StyledTab
          key={normalized.value}
          role="tab"
          aria-selected={selected}
          type="button"
          $selected={selected}
          $block={!!block}
          onClick={() => onChange?.(normalized.value)}
        >
          {normalized.label}
        </StyledTab>
      );
    })}
  </StyledTabs>
);
