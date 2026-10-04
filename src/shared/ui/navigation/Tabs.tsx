import type { HTMLAttributes } from "react";
import { StyledTab, StyledTabCount, StyledTabs } from "./Tabs.styled";

export type TabItem = {
  value: string;
  label: string;
  /** 그 분류의 건수 — 있으면 이름 옆에 알약으로 붙고 보조기기에는 "N건"으로 읽힌다 */
  count?: number;
};

export type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  items: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
};

/**
 * 같은 목록을 상태로 나누는 탭(처리 대기 2 · 승인 완료 14 · 거절됨 3). 켜진 탭은 1px 초록 윗선 + 초록 글자 + 흰 면.
 * 조건을 바꾸는 필터는 탭이 아니라 SegmentedControl(알약)을 쓴다.
 */
export const Tabs = ({ items, value, onChange, ...rest }: TabsProps) => (
  <StyledTabs role="tablist" {...rest}>
    {items.map((item) => {
      const selected = item.value === value;
      return (
        <StyledTab
          key={item.value}
          type="button"
          role="tab"
          aria-selected={selected}
          aria-label={item.count === undefined ? undefined : `${item.label} ${item.count}건`}
          $selected={selected}
          onClick={() => onChange?.(item.value)}
        >
          {item.label}
          {item.count === undefined ? null : (
            <StyledTabCount $selected={selected} aria-hidden="true">
              {item.count}
            </StyledTabCount>
          )}
        </StyledTab>
      );
    })}
  </StyledTabs>
);
