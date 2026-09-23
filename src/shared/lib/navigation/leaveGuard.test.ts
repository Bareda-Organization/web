import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmLeave, setLeaveWarning } from "./leaveGuard";

// 저장 안 한 편집이 있는 화면을 앱 안 이동(뒤로·사이드바·로그아웃)으로 떠날 때 한 번 묻는다 — 브라우저의
// beforeunload 는 창을 닫을 때만 불리고 앱 안 이동에는 안 불린다.
describe("leaveGuard", () => {
  afterEach(() => {
    setLeaveWarning(null);
    vi.restoreAllMocks();
  });

  it("경고가 없으면 묻지 않고 떠난다", () => {
    const confirm = vi.spyOn(window, "confirm");

    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("경고가 있으면 묻고, 취소하면 떠나지 않는다", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    setLeaveWarning("저장하지 않은 변경 2건이 사라집니다");

    expect(confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledWith("저장하지 않은 변경 2건이 사라집니다");
  });
});
