import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchField } from "./SearchField";

// 이 컴포넌트는 controlled(value/onChange 를 화면이 직접 잡는 형태)와
// uncontrolled(입력값을 DOM 에 맡기는 형태) 양쪽으로 쓰인다.
// F2 구현 좌석이 신고한 결함이 뒤쪽이다 — 제출 시 DOM 의 실제 입력값이 아니라
// value prop 을 읽으면 uncontrolled 화면에서 검색어가 항상 빈 문자열로 나간다.
describe("SearchField — 제출 값", () => {
  it("uncontrolled 로 써도 입력한 값이 그대로 제출된다", () => {
    const onSubmit = vi.fn();
    render(<SearchField onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("이름으로 검색"), {
      target: { value: "김하준" },
    });
    fireEvent.submit(document.querySelector("form")!);

    expect(onSubmit).toHaveBeenCalledWith("김하준");
  });

  it("controlled 로 쓰면 화면이 쥔 값이 제출된다", () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    render(<SearchField value="박서연" onChange={onChange} onSubmit={onSubmit} />);

    fireEvent.submit(document.querySelector("form")!);

    expect(onSubmit).toHaveBeenCalledWith("박서연");
  });
});
