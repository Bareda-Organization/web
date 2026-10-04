import { Icon } from "../core/Icon";
import type { SelectOption } from "./types";
import { StyledChevron, StyledFieldWrap, StyledHint, StyledLabel, StyledSelect, StyledWrap } from "./Select.styled";

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: string;
  hint?: string;
  /** 문자열 배열 또는 {value,label} 배열 */
  options?: Array<string | SelectOption>;
  wrapStyle?: React.CSSProperties;
};

/** 드롭다운 — 호차 선택, 등원 여부, 반 선택 등. 5분 단위 지연 시간처럼 선택지가 정해진 값은 DelayPicker를 쓰세요. */
export const Select = ({ label, hint, options = [], wrapStyle, ...rest }: SelectProps) => (
  <StyledWrap style={wrapStyle}>
    {label ? <StyledLabel>{label}</StyledLabel> : null}
    <StyledFieldWrap>
      <StyledSelect {...rest}>
        {options.map((option) => {
          const normalized = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={normalized.value} value={normalized.value}>
              {normalized.label}
            </option>
          );
        })}
      </StyledSelect>
      <StyledChevron>
        <Icon name="chevron-down" size={16} />
      </StyledChevron>
    </StyledFieldWrap>
    {hint ? <StyledHint>{hint}</StyledHint> : null}
  </StyledWrap>
);
