import { useId, useState } from "react";
import { StyledCounter, StyledHint, StyledHintAlone, StyledHintRow, StyledLabel, StyledTextarea, StyledWrap } from "./Textarea.styled";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  /** 안내 문구 — 글자 수 옆에 이어서 보인다. 개인정보를 적지 말라는 안내(예: "학생 이름·연락처는 적지 마세요")도 여기에 둔다 */
  hint?: string;
  rows?: number;
  wrapStyle?: React.CSSProperties;
};

/** 여러 줄 입력 — 학생 특이사항, 도착 지연 사유에 씁니다. `maxLength` 를 주면 `0 / 200` 글자 수가 아래에 붙는다. */
export const Textarea = ({ label, hint, rows = 4, wrapStyle, maxLength, onChange, id, "aria-describedby": describedBy, ...rest }: TextareaProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const noteId = `${fieldId}-note`;
  const [typedLength, setTypedLength] = useState(() => String(rest.defaultValue ?? "").length);
  // 값을 화면이 쥐고 있으면(value) 그 길이를, 아니면 입력 이벤트로 센 길이를 쓴다
  const length = rest.value === undefined ? typedLength : String(rest.value).length;
  const hasNote = maxLength !== undefined || Boolean(hint);

  return (
    <StyledWrap style={wrapStyle}>
      {label ? <StyledLabel htmlFor={fieldId}>{label}</StyledLabel> : null}
      <StyledTextarea
        id={fieldId}
        rows={rows}
        maxLength={maxLength}
        aria-describedby={[describedBy, hasNote ? noteId : undefined].filter(Boolean).join(" ") || undefined}
        onChange={(event) => {
          setTypedLength(event.target.value.length);
          onChange?.(event);
        }}
        {...rest}
      />
      {hasNote ? (
        <StyledHintRow id={noteId}>
          {maxLength !== undefined ? (
            <>
              <StyledCounter>
                {length} / {maxLength}
              </StyledCounter>
              {hint ? <StyledHint>{hint}</StyledHint> : null}
            </>
          ) : (
            <StyledHintAlone>{hint}</StyledHintAlone>
          )}
        </StyledHintRow>
      ) : null}
    </StyledWrap>
  );
};
