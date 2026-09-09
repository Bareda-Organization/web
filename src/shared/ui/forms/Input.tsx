import { Icon } from "../core/Icon";
import {
  StyledFieldWrap,
  StyledHelperText,
  StyledInput,
  StyledLabel,
  StyledLeadingIcon,
  StyledRequiredMark,
  StyledSuffix,
  StyledWrap,
} from "./Input.styled";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** 보조 설명 (300 / 13px) */
  hint?: string;
  /** 에러 문구. 차분하게 쓰고 다음 행동을 함께 안내합니다 */
  error?: string;
  /** 왼쪽 Lucide 아이콘 */
  icon?: string;
  /** 오른쪽 단위 텍스트 (예: '분', '명') */
  suffix?: string;
  required?: boolean;
  wrapStyle?: React.CSSProperties;
};

/** 단일 행 텍스트 입력 — 학생 추가·매니저 추가 폼의 기본 필드. */
export const Input = ({ label, hint, error, icon, suffix, required, wrapStyle, ...rest }: InputProps) => (
  <StyledWrap style={wrapStyle}>
    {label ? (
      <StyledLabel>
        {label}
        {required ? <StyledRequiredMark> *</StyledRequiredMark> : null}
      </StyledLabel>
    ) : null}
    <StyledFieldWrap>
      {icon ? (
        <StyledLeadingIcon>
          <Icon name={icon} size={18} />
        </StyledLeadingIcon>
      ) : null}
      <StyledInput $hasIcon={!!icon} $hasSuffix={!!suffix} $error={!!error} {...rest} />
      {suffix ? <StyledSuffix>{suffix}</StyledSuffix> : null}
    </StyledFieldWrap>
    {error || hint ? <StyledHelperText $error={!!error}>{error || hint}</StyledHelperText> : null}
  </StyledWrap>
);
