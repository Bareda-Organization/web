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
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // value 는 controlled 여부에 따라 undefined 일 수 있어(원본 SearchFieldProps 도 optional),
    // onSubmit 계약(string)을 지키기 위해 빈 문자열로 좁힌다.
    onSubmit?.(value ?? "");
  };
  return (
    <StyledForm onSubmit={handleSubmit} {...rest}>
      <StyledSearchIcon>
        <Icon name="search" size={18} />
      </StyledSearchIcon>
      <StyledInput value={value} onChange={onChange} placeholder={placeholder} />
      <StyledSubmitButton type="submit">검색</StyledSubmitButton>
    </StyledForm>
  );
};
