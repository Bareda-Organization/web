import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const resetAccountPassword = vi.fn();
vi.mock("../api", () => ({ resetAccountPassword: (...args: unknown[]) => resetAccountPassword(...args) }));

import { AccountPasswordResetDialog } from "./AccountPasswordResetDialog";

// §5.22 관리자 경유 비밀번호 초기화(Ruling 329) — SMS 연동 전 학원 사용자의 유일한 복구 경로라
// 관계자 웹에 진입점이 없으면 새 API 를 쓸 곳이 부재하다.
describe("AccountPasswordResetDialog", () => {
  afterEach(() => {
    resetAccountPassword.mockReset();
  });

  it("확인하면 초기화하고 아이디와 임시 비밀번호를 한 번 보여준다", async () => {
    resetAccountPassword.mockResolvedValue({ accountId: "5", loginId: "parentA1", temporaryPassword: "Tmp1234abcdEFGH" });
    render(<AccountPasswordResetDialog accountId="5" name="최부모" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 초기화" }));

    expect(await screen.findByText("Tmp1234abcdEFGH")).toBeInTheDocument();
    expect(screen.getByText("parentA1")).toBeInTheDocument();
    expect(resetAccountPassword).toHaveBeenCalledWith("5");
  });

  it("역할 · 연락처를 주면 제목과 본문에 붙고, 초기화 영향(첫 로그인 변경 · 기존 비밀번호 사용 불가)을 실행 전에 보인다", () => {
    render(<AccountPasswordResetDialog accountId="5" name="최동훈" roleLabel="기사" phone="010-0000-1005" onClose={() => {}} />);

    expect(screen.getByRole("dialog", { name: "최동훈 기사 비밀번호 초기화" })).toBeInTheDocument();
    expect(screen.getByText(/\(010-0000-1005\)의 비밀번호를 초기화할까요/)).toHaveTextContent("최동훈 기사(010-0000-1005)");
    expect(screen.getByText(/첫 로그인에서 새 비밀번호로 바꿔야 합니다/)).toBeInTheDocument();
    expect(screen.getByText("사용 불가")).toBeInTheDocument();
    expect(resetAccountPassword).not.toHaveBeenCalled();
  });

  it("확인 전에는 초기화하지 않는다", () => {
    render(<AccountPasswordResetDialog accountId="5" name="최부모" onClose={() => {}} />);

    expect(resetAccountPassword).not.toHaveBeenCalled();
    // 제목에도 이름이 있어 본문 문장으로 짚는다 — 누구의 비밀번호인지 본문이 말한다.
    expect(screen.getByText(/님의 비밀번호를 초기화할까요/)).toHaveTextContent("최부모");
  });
});
