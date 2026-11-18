import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapSurface } from "./MapSurface";

vi.mock("./naver/NaverMapSurface", () => ({
  NaverMapSurface: () => {
    throw new Error("sdk failed");
  },
}));

// 지도 SDK 가 렌더링 중 던져도 지도 자리만 대체 문구가 되고 옆 화면은 남는다.
describe("MapSurface — 렌더링 오류 격리", () => {
  afterEach(() => vi.restoreAllMocks());

  it("지도가 던지면 지도 자리에 대체 문구를 보인다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <p>옆 화면</p>
        <MapSurface camera={{ center: { lat: 37, lng: 127 }, zoom: 12 }} markers={[]} />
      </div>,
    );

    expect(screen.getByText("지도를 표시하지 못했습니다")).toBeInTheDocument();
    expect(screen.getByText("옆 화면")).toBeInTheDocument();
  });
});
