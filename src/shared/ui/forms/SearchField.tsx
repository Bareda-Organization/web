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
};

/** 학생·매니저 관리 페이지 상단 검색 — Enter 또는 검색 버튼 클릭으로 동작합니다. */
export const SearchField = ({
  value,
  onChange,
  onSubmit,
  placeholder = "이름으로 검색",
  ...rest
}: SearchFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 제출 값은 value prop 이 아니라 DOM 의 실제 입력값에서 읽는다 — value 를 읽으면
    // uncontrolled(입력값을 DOM 에 맡기는) 화면에서 검색어가 항상 빈 문자열로 나간다.
    // controlled 로 쓸 때는 DOM 값이 곧 value 라 결과가 같다.
    onSubmit?.(inputRef.current?.value ?? value ?? "");
  };
  return (
    <StyledForm onSubmit={handleSubmit} {...rest}>
      <StyledSearchIcon>
        <Icon name="search" size={18} />
      </StyledSearchIcon>
      <StyledInput ref={inputRef} value={value} onChange={onChange} placeholder={placeholder} />
      <StyledSubmitButton type="submit">검색</StyledSubmitButton>
    </StyledForm>
  );
};
