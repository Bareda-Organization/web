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

// F03-01 — 다른 `<form>` 안에 넣을 때는 자기 `<form>` 을 그리면 form 이 중첩된다(브라우저는 안쪽 태그를 버리고,
// React 는 submit 이벤트를 바깥 폼의 핸들러까지 올려 보낸다). `inForm` 이면 form 없이 Enter·버튼으로만 제출한다.
describe("SearchField — 다른 form 안에서 쓸 때(inForm)", () => {
  it("form 요소를 그리지 않고, Enter 와 [검색] 버튼으로 값을 제출하며 이벤트가 바깥으로 새지 않는다", () => {
    const onSubmit = vi.fn();
    const onOuterSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = render(
      <form onSubmit={onOuterSubmit}>
        <SearchField inForm onSubmit={onSubmit} placeholder="학원 검색" />
      </form>,
    );
    expect(container.querySelectorAll("form form")).toHaveLength(0);
    expect(container.querySelectorAll("form")).toHaveLength(1);

    const input = screen.getByPlaceholderText("학원 검색");
    fireEvent.change(input, { target: { value: "바래다" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenLastCalledWith("바래다");
    expect(onOuterSubmit).not.toHaveBeenCalled();
  });
});
