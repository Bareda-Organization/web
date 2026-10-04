import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

// Ruling 839 · 시안 `거절 사유 *` — 필수 칸에는 눈에 보이는 `*` 를 붙이되, 접근 이름(라벨)은 그대로여야 한다.
// 사유 칸 5곳(관리자 가입 거절 · 강제 확정 · 강제 종료 · 관계자 가입 거절 · 구간 변경 거절)의 시험이 `getByLabelText("…사유")` 로 칸을 찾는다.
describe("Textarea — 필수 표시", () => {
  it("required 이면 `*` 가 보이고 보조기기에는 읽히지 않는다(aria-hidden)", () => {
    render(<Textarea label="강제 종료 사유" required />);

    const mark = screen.getByText("*");
    expect(mark).toBeVisible();
    expect(mark).toHaveAttribute("aria-hidden", "true");
  });

  it("`*` 를 붙여도 칸의 접근 이름은 라벨 그대로이고 필수 칸으로 읽힌다", () => {
    render(<Textarea label="강제 종료 사유" required />);

    const field = screen.getByLabelText("강제 종료 사유");
    expect(screen.getByRole("textbox", { name: "강제 종료 사유" })).toBe(field);
    expect(field).toBeRequired();
  });

  it("required 가 아니면 `*` 가 없다", () => {
    render(<Textarea label="조치 메모 (선택)" />);

    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.getByLabelText("조치 메모 (선택)")).not.toBeRequired();
  });
});
