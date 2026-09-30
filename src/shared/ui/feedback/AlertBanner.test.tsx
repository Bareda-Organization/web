import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertBanner } from "./AlertBanner";

describe("AlertBanner", () => {
  it("F04-05: 문제 상황(missed)은 role=alert, 그 밖의 안내는 role=status 로 스크린리더에 알린다", () => {
    render(
      <>
        <AlertBanner tone="missed" title="실시간 연결 끊김" />
        <AlertBanner tone="info" title="저장했습니다" />
      </>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("실시간 연결 끊김");
    expect(screen.getByRole("status")).toHaveTextContent("저장했습니다");
  });
});
