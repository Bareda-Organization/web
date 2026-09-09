import type { HTMLAttributes } from "react";
import {
  StyledDelayPicker,
  StyledDelayPickerLabel,
  StyledDelayPickerGrid,
  StyledDelayPickerOption,
} from "./DelayPicker.styled";

export type DelayPickerProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  value?: number;
  onChange?: (minutes: number) => void;
  /** 분 단위 후보값. 기본 [5,10,15,20,25,30] */
  options?: number[];
};

const DELAY_OPTIONS = [5, 10, 15, 20, 25, 30];

// 도착 지연 시간 선택 — 기사·동승자 앱 공통, 5분 단위 고정.
export const DelayPicker = ({ value, onChange, options = DELAY_OPTIONS, ...rest }: DelayPickerProps) => {
  return (
    <StyledDelayPicker {...rest}>
      <StyledDelayPickerLabel>지연 시간 · 5분 단위</StyledDelayPickerLabel>
      <StyledDelayPickerGrid>
        {options.map((minutes) => {
          const active = minutes === value;
          return (
            <StyledDelayPickerOption
              key={minutes}
              type="button"
              $active={active}
              onClick={() => onChange?.(minutes)}
            >
              {minutes}분
            </StyledDelayPickerOption>
          );
        })}
      </StyledDelayPickerGrid>
    </StyledDelayPicker>
  );
};
