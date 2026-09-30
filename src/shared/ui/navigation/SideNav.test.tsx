import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SideNav } from "./SideNav";

const items = [
  { value: "dashboard", label: "운행 관리", icon: "layout-dashboard" },
  { value: "student", label: "학생 관리", icon: "users" },
];

// B1 #22 — 사이드바가 button 이라 새 탭으로 열기·링크 복사가 안 되고 현재 위치를 알릴 수 없었다.
describe("SideNav — 링크", () => {
  it("주소(href)가 있으면 링크로 그리고 현재 화면에 aria-current 를 단다", () => {
    render(<SideNav items={items} value="student" getHref={(value) => `/${value}`} />);

    expect(screen.getByRole("link", { name: /학생 관리/ })).toHaveAttribute("href", "/student");
    expect(screen.getByRole("link", { name: /학생 관리/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /운행 관리/ })).not.toHaveAttribute("aria-current");
  });

  it("그냥 누르면 화면 전환을 onChange 에 맡기고, Ctrl·Cmd·중간 클릭은 브라우저(새 탭)에 맡긴다", () => {
    const onChange = vi.fn();
    render(<SideNav items={items} value="dashboard" onChange={onChange} getHref={(value) => `/${value}`} />);
    const link = screen.getByRole("link", { name: /학생 관리/ });

    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { button: 1 });
    expect(onChange).not.toHaveBeenCalled();

    const defaultPrevented = !fireEvent.click(link);
    expect(onChange).toHaveBeenCalledWith("student");
    expect(defaultPrevented).toBe(true);
  });

  it("주소를 안 주면 예전처럼 버튼이다", () => {
    render(<SideNav items={items} value="dashboard" />);
    expect(screen.getByRole("button", { name: /학생 관리/ })).toBeInTheDocument();
  });
});
