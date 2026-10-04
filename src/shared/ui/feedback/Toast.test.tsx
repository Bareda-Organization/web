import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

type Trigger = { title: string; detail?: string; onUndo?: () => void; durationMs?: number };

// 화면이 하는 일을 흉내 낸다 — 버튼을 누르면 처리 결과 알림을 띄운다.
const Screen = ({ toast }: { toast: Trigger }) => {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => show(toast)}>
      처리
    </button>
  );
};

const renderScreen = (toast: Trigger) =>
  render(
    <ToastProvider>
      <Screen toast={toast} />
    </ToastProvider>,
  );

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("show 를 부르면 제목과 설명을 알림 영역(role=status)에 띄운다", () => {
    renderScreen({ title: "나우진 계정의 로그인 차단을 해제했습니다", detail: "처리자와 일시가 이력에 남았습니다" });

    fireEvent.click(screen.getByRole("button", { name: "처리" }));

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("나우진 계정의 로그인 차단을 해제했습니다");
    expect(toast).toHaveTextContent("처리자와 일시가 이력에 남았습니다");
  });

  it("지정한 시간이 지나면 저절로 사라진다", () => {
    renderScreen({ title: "저장했습니다", durationMs: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "처리" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("되돌릴 수 있는 동작(onUndo 가 있음)에만 '되돌리기'를 보이고, 누르면 되돌리고 알림을 닫는다", () => {
    const onUndo = vi.fn();
    renderScreen({ title: "차단을 해제했습니다", onUndo });
    fireEvent.click(screen.getByRole("button", { name: "처리" }));

    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("onUndo 가 없으면 '되돌리기' 버튼을 내지 않는다", () => {
    renderScreen({ title: "저장했습니다" });
    fireEvent.click(screen.getByRole("button", { name: "처리" }));

    expect(screen.queryByRole("button", { name: "되돌리기" })).not.toBeInTheDocument();
  });

  it("연달아 띄우면 쌓이고, 먼저 띄운 것부터 사라진다", () => {
    renderScreen({ title: "저장했습니다", durationMs: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "처리" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole("button", { name: "처리" }));
    expect(screen.getAllByRole("status")).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
