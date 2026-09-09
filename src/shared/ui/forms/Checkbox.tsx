import { Icon } from "../core/Icon";
import { StyledBox, StyledHiddenInput, StyledLabel, StyledLabelText, StyledSublabel } from "./Checkbox.styled";

export type CheckboxProps = Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange"> & {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: React.ReactNode;
  /** 보조 설명 한 줄 */
  sublabel?: string;
  disabled?: boolean;
};

/**
 * 다중 선택 — 정류장 순회 체크, 일괄 탑승 대상 선택.
 * 탑승/하차 상태 전환은 체크박스가 아니라 StudentRow의 상태 버튼을 씁니다.
 */
export const Checkbox = ({ checked, onChange, label, sublabel, disabled, ...rest }: CheckboxProps) => (
  <StyledLabel $disabled={!!disabled} {...rest}>
    <StyledHiddenInput type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} />
    <StyledBox $checked={!!checked}>{checked ? <Icon name="check" size={14} /> : null}</StyledBox>
    <span>
      <StyledLabelText>{label}</StyledLabelText>
      {sublabel ? <StyledSublabel>{sublabel}</StyledSublabel> : null}
    </span>
  </StyledLabel>
);
