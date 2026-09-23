import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLeaveWarning } from "@/shared/lib/navigation/leaveGuard";

const logout = vi.fn(async () => {});
vi.mock("../hooks/useAuthSession", () => ({ useAuthSession: () => ({ logout }) }));

import { LogoutButton } from "./LogoutButton";

describe("LogoutButton", () => {
  afterEach(() => {
    setLeaveWarning(null);
    vi.restoreAllMocks();
    logout.mockClear();
  });

  it("누르면 로그아웃한다(세션이 비면 가드가 로그인 화면으로 보낸다)", () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("저장 안 한 편집이 있으면 묻고, 취소하면 로그아웃하지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    setLeaveWarning("저장하지 않은 변경 1건이 사라집니다");
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(logout).not.toHaveBeenCalled();
  });
});
