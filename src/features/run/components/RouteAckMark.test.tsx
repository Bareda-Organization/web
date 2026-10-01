import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteAckMark } from "./RouteAckMark";

// A #3 — 관계자는 기사·동승자가 노선(변경) 확인 버튼을 눌렀는지 알아야 한다(MON-05).
// 서버의 ack 는 "확정 노선을 확인했는가" 라서 노선이 아직 없거나(idle) 끝난 회차(finished)·배치가 없는 자리엔 의미가 없다.
describe("RouteAckMark", () => {
  it("확정·운행 중 회차에 배치된 사람이 확인했으면 '확인' 을 보인다", () => {
    render(<RouteAckMark name="김기사" acked runStatus="confirmed" />);
    expect(screen.getByText("확인")).toBeInTheDocument();
  });

  it("아직 확인하지 않았으면 '미확인' 을 보인다", () => {
    render(<RouteAckMark name="김기사" acked={false} runStatus="moving" />);
    expect(screen.getByText("미확인")).toBeInTheDocument();
  });

  it.each([
    ["idle", "김기사"],
    ["finished", "김기사"],
    ["confirmed", null],
  ] as const)("의미 없는 자리(%s · 배치 %s)에는 아무것도 그리지 않는다", (runStatus, name) => {
    const { container } = render(<RouteAckMark name={name} acked={false} runStatus={runStatus} />);
    expect(container).toBeEmptyDOMElement();
  });
});
