import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { getRouteDetail } from "../api";
import type { RouteDetailResponseTypes } from "../types";
import { RouteDetail } from "./RouteDetail";

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("../api", () => ({ getRouteDetail: vi.fn() }));

// 승하차지 패널이 언마운트됐다 다시 마운트되는지만 본다 — 저장 전 편집은 패널 상태에 있다.
const mounts = vi.fn();
vi.mock("./RouteStopsPanel", () => ({
  RouteStopsPanel: () => {
    useEffect(() => {
      mounts();
    }, []);
    return <p>승하차지 패널</p>;
  },
}));
vi.mock("./RouteForm", () => ({
  RouteForm: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>수정 저장</button>,
}));

const mockGetDetail = vi.mocked(getRouteDetail);

const detail: RouteDetailResponseTypes = {
  id: "1",
  busId: "3",
  busNo: "1호차",
  weekday: "mon",
  direction: "to_academy",
  name: "본선",
  active: true,
  stops: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDetail.mockResolvedValue(detail);
});

describe("RouteDetail — F02-11 편성 정보 수정 뒤에도 승하차지 편집이 남는다", () => {
  it("편성 정보를 저장해 상세를 다시 불러와도 승하차지 패널은 다시 마운트되지 않는다", async () => {
    render(<RouteDetail routeId="1" />);
    const panel = await screen.findByText("승하차지 패널");
    // effect 는 화면이 그려진 뒤에 돈다 — 요소가 보이는 순간 mounts 가 이미 불렸다고 가정하면 부하가 높을 때 0 번으로 읽힌다.
    await waitFor(() => expect(mounts).toHaveBeenCalledTimes(1));

    mockGetDetail.mockResolvedValue({ ...detail, name: "새 이름" });
    fireEvent.click(screen.getByRole("button", { name: "편성 정보 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }));

    await waitFor(() => expect(screen.getByText("새 이름")).toBeInTheDocument());
    // 다시 마운트되면 DOM 요소가 새로 만들어진다 — 처음 요소가 그대로면 effect 시점과 무관하게 재마운트가 없다.
    expect(screen.getByText("승하차지 패널")).toBe(panel);
    expect(mounts).toHaveBeenCalledTimes(1);
  });
});
