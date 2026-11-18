import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import GlobalError from "./global-error";
import NotFound from "./not-found";

// 화면 하나가 렌더링 중 던져도 콘솔 전체가 백지가 되지 않고, 한국어 안내와 다시 시도 동작이 남는다.
describe("앱 오류 화면", () => {
  it("error: 안내 문구를 보이고 다시 시도 버튼이 retry 를 부른다", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorPage error={new Error("boom")} retry={retry} />);

    expect(screen.getByText("화면을 불러오지 못했습니다")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("global-error: 자체 html 문서 안에 안내 문구와 다시 시도 버튼을 그린다", () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error("boom")} retry={() => {}} />);

    expect(html).toContain("<html");
    expect(html).toContain("화면을 불러오지 못했습니다");
    expect(html).toContain("다시 시도");
  });

  it("not-found: 찾을 수 없다는 안내와 처음 화면으로 가는 링크를 보인다", () => {
    render(<NotFound />);

    expect(screen.getByText("페이지를 찾을 수 없습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "처음으로" })).toHaveAttribute("href", "/");
  });
});
