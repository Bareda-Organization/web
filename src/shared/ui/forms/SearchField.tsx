import { useRef } from "react";

import { Icon } from "../core/Icon";
import { StyledForm, StyledInput, StyledSearchIcon, StyledSubmitButton } from "./SearchField.styled";

/**
 * 이름 검색 — Enter 또는 검색 버튼으로 제출 (관계자 웹 학생/매니저 관리 플로우).
 */
export type SearchFieldProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** 다른 `<form>` 안에서 쓸 때 true — 자기 form 을 그리지 않아 form 이 중첩되지 않는다(Enter·[검색] 버튼으로만 제출) */
  inForm?: boolean;
};

/** 학생·매니저 관리 페이지 상단 검색 — Enter 또는 검색 버튼 클릭으로 동작합니다. */
export const SearchField = ({
  value,
  onChange,
  onSubmit,
  placeholder = "이름으로 검색",
  inForm = false,
  ...rest
}: SearchFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // 제출 값은 value prop 이 아니라 DOM 의 실제 입력값에서 읽는다 — value 를 읽으면
  // uncontrolled(입력값을 DOM 에 맡기는) 화면에서 검색어가 항상 빈 문자열로 나간다.
  // controlled 로 쓸 때는 DOM 값이 곧 value 라 결과가 같다.
  const submit = () => onSubmit?.(inputRef.current?.value ?? value ?? "");
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };
  // inForm 이면 바깥 form 의 제출로 이어지지 않게 Enter 를 여기서 막고 직접 제출한다.
  const handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submit();
  };
  return (
    <StyledForm as={inForm ? "div" : "form"} onSubmit={inForm ? undefined : handleSubmit} {...rest}>
      <StyledSearchIcon>
        <Icon name="search" size={18} />
      </StyledSearchIcon>
      <StyledInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={inForm ? handleEnter : undefined}
        placeholder={placeholder}
      />
      <StyledSubmitButton type={inForm ? "button" : "submit"} onClick={inForm ? submit : undefined}>
        검색
      </StyledSubmitButton>
    </StyledForm>
  );
};
