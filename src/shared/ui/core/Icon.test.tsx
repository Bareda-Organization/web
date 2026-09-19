import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

// R19 목표 3.1 — Icon 이 unpkg CDN 대신 번들의 lucide-react 를 쓴다(CORS 콘솔 오류
// 제거). DOM 에 외부 URL 이 전혀 안 남고, 결국 실제 svg 로 그려지는지를 본다.
describe("Icon — 번들에서 lucide 아이콘을 그린다(R19 목표 3.1)", () => {
  it("unpkg.com 을 참조하지 않고, 이름에 맞는 svg 를 그린다", async () => {
    const { container } = render(<Icon name="bus" />);

    expect(container.innerHTML).not.toContain("unpkg.com");

    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
  });
});
