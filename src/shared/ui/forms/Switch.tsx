import {
  StyledHiddenInput,
  StyledLabel,
  StyledLabelText,
  StyledSublabel,
  StyledTextGroup,
  StyledThumb,
  StyledTrack,
} from "./Switch.styled";

export type SwitchProps = Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange"> & {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: React.ReactNode;
  sublabel?: string;
  /** 도착 지연 알림처럼 끌 수 없는 항목은 disabled로 두고 이유를 sublabel에 씁니다 */
  disabled?: boolean;
};

/** on/off 설정 — 학부모·학생 앱 알림 설정 화면의 기본 컨트롤. */
export const Switch = ({ checked, onChange, label, sublabel, disabled, ...rest }: SwitchProps) => (
  <StyledLabel $disabled={!!disabled} {...rest}>
    <StyledTextGroup>
      <StyledLabelText>{label}</StyledLabelText>
      {sublabel ? <StyledSublabel>{sublabel}</StyledSublabel> : null}
    </StyledTextGroup>
    <StyledHiddenInput type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} />
    <StyledTrack $checked={!!checked}>
      <StyledThumb $checked={!!checked} />
    </StyledTrack>
  </StyledLabel>
);
