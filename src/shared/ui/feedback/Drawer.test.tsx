import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";

// 옆 패널(drawer) — 목록을 두고 상세를 보는 작업. 대화상자와 같은 접근성 약속(역할 · Esc · 초점)을 지킨다.
describe("Drawer", () => {
  it("대화상자 역할(aria-modal)과 제목으로 된 이름을 가진다", () => {
    render(<Drawer title="김정은 · 동승 매니저">본문</Drawer>);

    const drawer = screen.getByRole("dialog", { name: "김정은 · 동승 매니저" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
  });

  it("Esc 를 누르면 onClose 를 부른다", () => {
    const onClose = vi.fn();
    render(
      <Drawer title="상세" onClose={onClose}>
        본문
      </Drawer>,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("열리면 초점이 패널 안으로 들어오고, 닫히면 열기 전 요소로 돌아간다", () => {
    const { rerender } = render(<button type="button">상세 열기</button>);
    const opener = screen.getByRole("button", { name: "상세 열기" });
    opener.focus();

    rerender(
      <>
        <button type="button">상세 열기</button>
        <Drawer title="상세">
          <button type="button">승인</button>
        </Drawer>
      </>,
    );
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    rerender(<button type="button">상세 열기</button>);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "상세 열기" }));
  });

  it("Tab 이 패널 밖으로 빠져나가지 않고 처음·끝 사이를 돈다", () => {
    render(
      <Drawer title="상세">
        <button type="button">거절</button>
        <button type="button">승인</button>
      </Drawer>,
    );
    const reject = screen.getByRole("button", { name: "거절" });
    const approve = screen.getByRole("button", { name: "승인" });

    approve.focus();
    fireEvent.keyDown(approve, { key: "Tab" });
    expect(document.activeElement).toBe(reject);

    fireEvent.keyDown(reject, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(approve);
  });

  it("바깥(어두운 영역)을 눌러도 닫히지 않는다 — 입력 중이던 폼이 스치는 클릭에 사라지지 않게", () => {
    const onClose = vi.fn();
    render(
      <Drawer title="상세" onClose={onClose}>
        본문
      </Drawer>,
    );

    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("닫기(×) 버튼을 누르면 onClose 를 부른다", () => {
    const onClose = vi.fn();
    render(
      <Drawer title="상세" onClose={onClose}>
        본문
      </Drawer>,
    );

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("open 이 false 이면 아무것도 그리지 않는다", () => {
    render(
      <Drawer open={false} title="상세">
        본문
      </Drawer>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
