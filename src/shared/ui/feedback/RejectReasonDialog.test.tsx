import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RejectReasonDialog } from "./RejectReasonDialog";

const baseProps = {
  open: true,
  title: "홍길동 가입 요청 거절",
  confirmLabel: "가입 거절",
  reason: "",
  onReasonChange: () => {},
  fieldHint: "신청자에게 그대로 전달됩니다",
  emptyHint: "사유를 입력하면 [가입 거절] 버튼이 켜집니다",
  submitting: false,
  onConfirm: () => {},
  onClose: () => {},
};

describe("RejectReasonDialog", () => {
  it("사유가 비어 있으면 확정 단추가 꺼지고 이유 글이 보인다", () => {
    render(<RejectReasonDialog {...baseProps} />);

    expect(screen.getByRole("button", { name: "가입 거절" })).toBeDisabled();
    expect(screen.getByText(baseProps.emptyHint)).toBeInTheDocument();
  });

  it("사유가 있으면 확정 단추가 켜지고 누르면 onConfirm 을 부른다", () => {
    const onConfirm = vi.fn();
    render(<RejectReasonDialog {...baseProps} reason="서류 미비" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "가입 거절" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(baseProps.emptyHint)).toBeNull();
  });

  it("사유 입력은 onReasonChange 로 전달된다", () => {
    const onReasonChange = vi.fn();
    render(<RejectReasonDialog {...baseProps} onReasonChange={onReasonChange} />);

    fireEvent.change(screen.getByLabelText("거절 사유"), { target: { value: "정원 초과" } });

    expect(onReasonChange).toHaveBeenCalledWith("정원 초과");
  });

  it("처리 중이면 확정 단추가 '처리 중...' 이 되고 꺼진다", () => {
    render(<RejectReasonDialog {...baseProps} reason="서류 미비" submitting />);

    expect(screen.getByRole("button", { name: "처리 중..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "뒤로" })).toBeDisabled();
  });

  it("confirmDisabled 면 사유가 있어도 확정 단추가 꺼진다", () => {
    render(<RejectReasonDialog {...baseProps} reason="서류 미비" confirmDisabled />);

    expect(screen.getByRole("button", { name: "가입 거절" })).toBeDisabled();
  });

  it("open=false 면 아무것도 그리지 않는다", () => {
    render(<RejectReasonDialog {...baseProps} open={false} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
