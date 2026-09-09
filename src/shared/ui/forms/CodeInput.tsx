import {
  StyledChar,
  StyledCharRow,
  StyledFieldWrap,
  StyledHelperText,
  StyledHiddenInput,
  StyledLabel,
  StyledWrap,
} from "./CodeInput.styled";

/**
 * 부여된 코드 입력 — 세 제품 모두 아이디/비밀번호 없이 코드로 로그인합니다.
 */
export type CodeInputProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** 칸 수 (기본 6) */
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: string;
  /** 로그인 실패 시 문구. 다음 행동을 함께 안내합니다 */
  error?: string;
};

/** 학부모/학생/기사/동승자/관계자 코드 로그인 입력 — 대문자로 자동 변환됩니다. */
export const CodeInput = ({ length = 6, value = "", onChange, label, hint, error, ...rest }: CodeInputProps) => {
  const chars = Array.from({ length }, (_, index) => value[index] || "");
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value.toUpperCase().slice(0, length));
  };
  return (
    <StyledWrap {...rest}>
      {label ? <StyledLabel>{label}</StyledLabel> : null}
      <StyledFieldWrap>
        <StyledHiddenInput
          value={value}
          inputMode="text"
          autoComplete="one-time-code"
          maxLength={length}
          onChange={handleChange}
        />
        <StyledCharRow>
          {chars.map((char, index) => (
            // 칸은 고정된 자리(0번째~length-1번째)라 순서가 바뀌지 않는다 — index 가 곧 자리 식별자다.
            <StyledChar key={index} $filled={!!char} $error={!!error}>
              {char || ""}
            </StyledChar>
          ))}
        </StyledCharRow>
      </StyledFieldWrap>
      {error || hint ? <StyledHelperText $error={!!error}>{error || hint}</StyledHelperText> : null}
    </StyledWrap>
  );
};
