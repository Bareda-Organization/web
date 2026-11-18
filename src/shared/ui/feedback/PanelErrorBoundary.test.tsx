import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PanelErrorBoundary } from "./PanelErrorBoundary";

let shouldThrow = true;
const Bomb = () => {
  if (shouldThrow) throw new Error("render failed");
  return <p>정상 패널</p>;
};

// 실시간·지도 패널 하나가 렌더링 중 던져도 그 패널만 대체 문구로 바뀌고 나머지 화면은 남는다.
describe("PanelErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("자식이 던지면 대체 문구를 보이고 형제 요소는 그대로 둔다", () => {
    render(
      <div>
        <p>옆 화면</p>
        <PanelErrorBoundary title="지도를 표시하지 못했습니다">
          <Bomb />
        </PanelErrorBoundary>
      </div>,
    );

    expect(screen.getByText("지도를 표시하지 못했습니다")).toBeInTheDocument();
    expect(screen.getByText("옆 화면")).toBeInTheDocument();
    expect(screen.queryByText("정상 패널")).not.toBeInTheDocument();
  });

  it("다시 시도를 누르면 자식을 다시 그린다", () => {
    render(
      <PanelErrorBoundary title="지도를 표시하지 못했습니다">
        <Bomb />
      </PanelErrorBoundary>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(screen.getByText("정상 패널")).toBeInTheDocument();
  });
});
