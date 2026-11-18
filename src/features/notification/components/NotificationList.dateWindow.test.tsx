import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAckedNotificationCount, getNotifications } from "../api";
import { NotificationList } from "./NotificationList";

vi.mock("../api", () => ({
  getNotifications: vi.fn(),
  getAckedNotificationCount: vi.fn().mockResolvedValue(0),
}));

const ALLOWED_FILTER_KEYS = ["acked", "date", "group", "recipientRole", "type"];

// 알림 로그 조회는 하루(`date`)만 받는다(API_SPEC §5.17) — 서버가 날짜 구간을 31일로 제한해도 이 화면은 31일을 넘는 구간을 만들 수 없다.
// 구간을 고르는 입력이나 시작·끝 필터가 생기면 이 검사가 실패해, 31일 제한을 화면에도 걸도록 알린다.
describe("NotificationList — 조회 날짜 범위", () => {
  afterEach(() => vi.clearAllMocks());

  it("날짜 입력은 하나뿐이다", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ items: [], page: 0, size: 20, totalCount: 0, hasNext: false, unackedCount: 0 });
    const { container } = render(<NotificationList />);

    await waitFor(() => expect(container.querySelector('[aria-busy="false"]')).toBeTruthy());

    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(1);
  });

  it("고른 하루만 date 로 보내고 구간 필터는 보내지 않는다", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ items: [], page: 0, size: 20, totalCount: 0, hasNext: false, unackedCount: 0 });
    render(<NotificationList />);

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-11-01" } });

    await waitFor(() => expect(vi.mocked(getNotifications).mock.calls.some(([, , filters]) => filters?.date === "2026-11-01")).toBe(true));
    for (const [, , filters] of vi.mocked(getNotifications).mock.calls) {
      expect(Object.keys(filters ?? {}).filter((key) => !ALLOWED_FILTER_KEYS.includes(key))).toEqual([]);
    }
    for (const [filters] of vi.mocked(getAckedNotificationCount).mock.calls) {
      expect(Object.keys(filters ?? {}).filter((key) => !ALLOWED_FILTER_KEYS.includes(key))).toEqual([]);
    }
  });
});
