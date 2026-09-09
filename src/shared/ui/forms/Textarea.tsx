import { StyledHint, StyledLabel, StyledTextarea, StyledWrap } from "./Textarea.styled";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  rows?: number;
  wrapStyle?: React.CSSProperties;
};

/** 여러 줄 입력 — 학생 특이사항, 도착 지연 사유에 씁니다. */
export const Textarea = ({ label, hint, rows = 4, wrapStyle, ...rest }: TextareaProps) => (
  <StyledWrap style={wrapStyle}>
    {label ? <StyledLabel>{label}</StyledLabel> : null}
    <StyledTextarea rows={rows} {...rest} />
    {hint ? <StyledHint>{hint}</StyledHint> : null}
  </StyledWrap>
);
