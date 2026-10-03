import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBlockedAccounts, getStaffSignupRequests } from "../api";
import { AdminPendingProvider, useAdminPending } from "./AdminPendingProvider";

vi.mock("../api", () => ({ getStaffSignupRequests: vi.fn(), getBlockedAccounts: vi.fn() }));

const mockSignups = vi.mocked(getStaffSignupRequests);
const mockBlocked = vi.mocked(getBlockedAccounts);
const page = (totalCount: number) => ({ items: [], page: 0, size: 1, totalCount, hasNext: false });

const Probe = () => {
  const { signupCount, blockedCount } = useAdminPending();
  return <p>{`가입 ${signupCount} · 차단 ${blockedCount}`}</p>;
};

describe("AdminPendingProvider", () => {
  beforeEach(() => {
    mockSignups.mockReset();
    mockBlocked.mockReset();
  });

  it("가입 승인 대기와 차단 계정 수를 기존 목록 API 의 전체 건수로 센다", async () => {
    mockSignups.mockResolvedValue(page(11));
    mockBlocked.mockResolvedValue(page(1));

    render(
      <AdminPendingProvider>
        <Probe />
      </AdminPendingProvider>,
    );

    await waitFor(() => expect(screen.getByText("가입 11 · 차단 1")).toBeInTheDocument());
    expect(mockSignups).toHaveBeenCalledWith({ page: 0, size: 1 });
    expect(mockBlocked).toHaveBeenCalledWith({ page: 0, size: 1 });
  });

  // 가입 승인·차단 해제 같은 처리 화면이 30초 폴링을 기다리지 않고 배지를 바로 다시 세게 한다.
  it("refresh 를 부르면 폴링 주기를 기다리지 않고 바로 다시 센다", async () => {
    mockSignups.mockResolvedValue(page(3));
    mockBlocked.mockResolvedValue(page(0));
    const RefreshButton = () => {
      const { refresh } = useAdminPending();
      return <button onClick={() => void refresh()}>다시 세기</button>;
    };
    render(
      <AdminPendingProvider>
        <Probe />
        <RefreshButton />
      </AdminPendingProvider>,
    );
    await waitFor(() => expect(screen.getByText("가입 3 · 차단 0")).toBeInTheDocument());

    mockSignups.mockResolvedValue(page(2));
    fireEvent.click(screen.getByRole("button", { name: "다시 세기" }));

    await waitFor(() => expect(screen.getByText("가입 2 · 차단 0")).toBeInTheDocument());
  });
});
