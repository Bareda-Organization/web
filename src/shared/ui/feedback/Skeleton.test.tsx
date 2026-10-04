import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonGroup } from "./Skeleton";

// 불러오는 중 뼈대 — 눈으로는 자리 모양만 보이므로 보조기기에는 "불러오는 중…" 한 줄과 aria-busy 로 알린다.
describe("SkeletonGroup", () => {
  it("묶음은 aria-busy 와 '불러오는 중…' 안내를 갖고, 조각 하나하나는 보조기기에서 숨긴다", () => {
    render(
      <SkeletonGroup>
        <Skeleton variant="title" data-testid="piece" />
      </SkeletonGroup>,
    );

    const group = screen.getByRole("status");
    expect(group).toHaveAttribute("aria-busy", "true");
    expect(group).toHaveTextContent("불러오는 중…");
    expect(screen.getByTestId("piece")).toHaveAttribute("aria-hidden", "true");
  });

  it("움직임 줄이기를 켠 사용자에게는 깜빡임을 멈춘다", () => {
    render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>,
    );

    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules));
    const reduced = rules.filter((rule) => rule.cssText.startsWith("@media (prefers-reduced-motion: reduce)"));
    expect(reduced.some((rule) => /animation:\s*none/.test(rule.cssText))).toBe(true);
  });
});
