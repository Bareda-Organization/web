import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("C00-04·F04-05: 대화상자 역할과 제목으로 된 이름을 가진다", () => {
    render(<Dialog title="학생 삭제">본문</Dialog>);

    const dialog = screen.getByRole("dialog", { name: "학생 삭제" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("F04-05: Esc 를 누르면 onClose 를 부른다", () => {
    const onClose = vi.fn();
    render(
      <Dialog title="삭제" onClose={onClose}>
        본문
      </Dialog>,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("F04-05: 열리면 초점이 대화상자 안으로 들어오고, 닫히면 열기 전 요소로 돌아간다", () => {
    const { rerender } = render(<button type="button">열기</button>);
    const opener = screen.getByRole("button", { name: "열기" });
    opener.focus();

    rerender(
      <>
        <button type="button">열기</button>
        <Dialog title="삭제">
          <button type="button">확인</button>
        </Dialog>
      </>,
    );
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    rerender(<button type="button">열기</button>);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "열기" }));
  });

  it("F04-05: Tab 이 대화상자 밖으로 빠져나가지 않고 처음·끝 사이를 돈다", () => {
    render(
      <Dialog title="삭제">
        <button type="button">취소</button>
        <button type="button">확인</button>
      </Dialog>,
    );
    const cancel = screen.getByRole("button", { name: "취소" });
    const confirm = screen.getByRole("button", { name: "확인" });

    confirm.focus();
    fireEvent.keyDown(confirm, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);

    fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it("F04-05: 바깥(어두운 영역)을 눌러도 닫히지 않는다 — 입력 중이던 폼이 스치는 클릭에 사라지지 않게", () => {
    const onClose = vi.fn();
    render(
      <Dialog title="학생 등록" onClose={onClose}>
        본문
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("F04-04: 겹침 막이 위치 잡힌 조상이 아니라 화면(뷰포트) 기준으로 뜬다", () => {
    render(<Dialog title="삭제">본문</Dialog>);

    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    expect(getComputedStyle(overlay).position).toBe("fixed");
  });
});
