import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("@/shared/lib/http", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));
const logout = vi.fn(async () => {});
vi.mock("../hooks/useAuthSession", () => ({ useAuthSession: () => ({ logout }) }));

import { TestDataResetButton } from "./TestDataResetButton";

// Ruling 364 — 팀원 체험용 서버에서 테스트 데이터를 시드 상태로 되돌리는 버튼. 초기화가 로그인 유지 토큰까지
// 지우므로 끝나면 로그아웃한다 — 안 하면 한참 뒤 아무 화면에서나 갑자기 로그인 화면으로 튕긴다.
describe("TestDataResetButton", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    apiFetch.mockReset();
    logout.mockClear();
  });

  it("설정이 켜져 있지 않으면 보이지 않는다", () => {
    render(<TestDataResetButton />);

    expect(screen.queryByRole("button", { name: "테스트 데이터 초기화" })).toBeNull();
  });

  it("확인하면 초기화를 요청하고 끝나면 로그아웃한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_TEST_DATA_RESET", "true");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    apiFetch.mockResolvedValue({ cleared_position_keys: 3 });
    render(<TestDataResetButton />);

    fireEvent.click(screen.getByRole("button", { name: "테스트 데이터 초기화" }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledWith("/dev/reset", { method: "POST" });
  });

  it("확인 창에서 취소하면 아무것도 하지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_TEST_DATA_RESET", "true");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<TestDataResetButton />);

    fireEvent.click(screen.getByRole("button", { name: "테스트 데이터 초기화" }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it("초기화가 실패하면 알리고 로그아웃하지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_TEST_DATA_RESET", "true");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    apiFetch.mockRejectedValue(new Error("boom"));
    render(<TestDataResetButton />);

    fireEvent.click(screen.getByRole("button", { name: "테스트 데이터 초기화" }));

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(logout).not.toHaveBeenCalled();
  });
});
