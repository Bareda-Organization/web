import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeConnectionStrip } from "./RealtimeConnectionStrip";

vi.mock("../../hooks", () => ({
  useRealtimeConnection: () => {
    throw new Error("ws state failed");
  },
}));

// 실시간 연결 띠가 렌더링 중 던져도 띠 자리만 대체 문구가 되고 레이아웃의 나머지는 남는다.
describe("RealtimeConnectionStrip — 렌더링 오류 격리", () => {
  afterEach(() => vi.restoreAllMocks());

  it("연결 상태를 읽다 던져도 대체 문구를 보이고 형제 요소는 남는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <p>레이아웃 본문</p>
        <RealtimeConnectionStrip />
      </div>,
    );

    expect(screen.getByText("실시간 연결 상태를 표시하지 못했습니다")).toBeInTheDocument();
    expect(screen.getByText("레이아웃 본문")).toBeInTheDocument();
  });
});
