import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SideNav } from "./SideNav";

const groups = [
  { items: [{ value: "dashboard", label: "오늘 현황", icon: "layout-dashboard" }] },
  {
    title: "오늘 운행",
    items: [
      { value: "today-run", label: "운행 상세", icon: "bus" },
      { value: "emergency", label: "비상 알림", icon: "triangle-alert", badge: 3 },
    ],
  },
  { title: "처리 대기", items: [{ value: "signup-approval", label: "가입 승인", icon: "user-check", badge: 2 }] },
];

// 사이드 메뉴 묶음 — 평면 목록이던 메뉴가 묶음 제목 아래로 나뉜다. 제목 없는 첫 묶음(대시보드)도 허용한다.
describe("SideNav — 묶음", () => {
  it("묶음 제목을 이름으로 가진 그룹 아래에 항목을 순서대로 놓는다", () => {
    render(<SideNav groups={groups} value="today-run" getHref={(value) => `/${value}`} />);

    const group = screen.getByRole("group", { name: "오늘 운행" });
    const links = within(group).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["운행 상세", "비상 알림3"]);
    expect(screen.getByText("처리 대기")).toBeInTheDocument();
  });

  it("묶음이 여러 개여도 항목은 위에서 아래로 한 줄로 이어진다(제목 없는 묶음 포함)", () => {
    render(<SideNav groups={groups} value="dashboard" getHref={(value) => `/${value}`} />);

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/today-run",
      "/emergency",
      "/signup-approval",
    ]);
  });

  it("배지는 건수를 이름에 붙이고, 현재 화면 항목에만 aria-current 를 단다", () => {
    render(<SideNav groups={groups} value="emergency" getHref={(value) => `/${value}`} />);

    expect(screen.getByRole("link", { name: "비상 알림 3건" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "가입 승인 2건" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "운행 상세" })).not.toHaveAttribute("aria-current");
  });

  it("건수 0 · 배지 없음이면 건수를 붙이지 않는다", () => {
    render(<SideNav groups={[{ items: [{ value: "a", label: "학생 관리", icon: "users", badge: 0 }] }]} getHref={(value) => `/${value}`} />);

    expect(screen.getByRole("link", { name: "학생 관리" })).toBeInTheDocument();
  });
});
