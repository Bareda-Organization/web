import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilterBar } from "./FilterBar";

// Ruling 839 — 필터 줄 아래 간격은 화면 레이아웃의 gap 이 쥔다. 이 부품이 아래 여백(margin-bottom)을 또 가지면 두 여백이 겹쳐
// 시안(필터 줄 ↔ 다음 덩어리 16px)보다 16~20px 벌어졌다(관계자 화면 7곳 실측 32 · 36px).
describe("FilterBar — 아래 여백", () => {
  it("스스로 아래 여백을 두지 않는다", () => {
    render(<FilterBar data-testid="filter-bar">조건</FilterBar>);

    const marginBottom = getComputedStyle(screen.getByTestId("filter-bar")).marginBottom;
    expect(["", "0", "0px"]).toContain(marginBottom);
  });
});
