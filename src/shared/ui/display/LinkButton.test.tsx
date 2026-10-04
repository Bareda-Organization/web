import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkButton } from "./LinkButton";

// 화면 확인에서 발견 — styled(Link) 가 `$variant` 를 <a> 속성으로 내려 React 가 "Invalid attribute name" 오류를 냈다(시험은 통과했다).
describe("LinkButton", () => {
  afterEach(() => vi.restoreAllMocks());

  it("링크로 그리고, 모양 인자($variant · $size)를 DOM 속성으로 내리지 않는다", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<LinkButton href="/member-accounts" variant="primary">계정 관리</LinkButton>);

    const link = screen.getByRole("link", { name: "계정 관리" });
    expect(link).toHaveAttribute("href", "/member-accounts");
    expect(link.getAttributeNames().some((name) => name.startsWith("$"))).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});
