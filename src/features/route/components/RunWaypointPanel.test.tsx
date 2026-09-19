import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunWaypointPanel } from "./RunWaypointPanel";
import { getRuns } from "@/features/schedule";
import type { RunItemResponseTypes } from "@/features/schedule";
import { addRunWaypoint } from "../api";
import type { WaypointResultResponseTypes } from "../types";

// `R18-C2` 목표 3 — 이 화면도 §5.5(ChangeApprovalDetail)와 같은 이유로 소요시간(분) 비교를
// 보여줘야 하므로, addRunWaypoint 호출부만 목으로 바꿔 그 값이 실제로 그려지는지 본다.
vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, addRunWaypoint: vi.fn(), removeRunWaypoint: vi.fn() };
});

const mockAddRunWaypoint = vi.mocked(addRunWaypoint);

// FE-R3 W3 목표 9 판정 ① — "오늘 회차" 목록이 이 화면에 카탈로그로 없어 run_id 를
// 손으로 치던 문제를 화면 설계 문제로 판정해 고쳤다(주석 §1 참고). 그 판정이 실제로
// 지키는 것은 "이 노선(busId·direction)과 무관한 회차, 이미 취소된 회차가 드롭다운
// 후보에 섞이면 안 된다" 는 조건이다 — 섞이면 관계자가 남의 회차에 경유 지점을 배포하는
// 사고로 이어진다.
vi.mock("@/features/schedule", async () => {
  const actual = await vi.importActual<typeof import("@/features/schedule")>("@/features/schedule");
  return { ...actual, getRuns: vi.fn() };
});

const mockGetRuns = vi.mocked(getRuns);

const buildRun = (overrides: Partial<RunItemResponseTypes>): RunItemResponseTypes => ({
  id: 1,
  busId: 10,
  busNo: "701호",
  scheduleId: 1,
  serviceDate: "2026-09-14",
  direction: "to_academy",
  departTime: "08:00",
  confirmAt: "2026-09-14T07:30:00Z",
  status: "idle",
  originName: "출발지",
  destinationName: "도착지",
  estDurationMin: 20,
  canceledAt: null,
  assignments: [],
  ...overrides,
});

describe("RunWaypointPanel — 오늘 회차 드롭다운 필터", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("같은 호차·방향이면서 취소되지 않은 회차만 드롭다운 후보로 남긴다", async () => {
    mockGetRuns.mockResolvedValue({
      items: [
        buildRun({ id: 1, busId: 10, direction: "to_academy", canceledAt: null }),
        buildRun({ id: 2, busId: 99, direction: "to_academy", canceledAt: null }), // 다른 호차
        buildRun({ id: 3, busId: 10, direction: "from_academy", canceledAt: null }), // 다른 방향
        buildRun({ id: 4, busId: 10, direction: "to_academy", canceledAt: "2026-09-14T06:00:00Z" }), // 취소됨
      ],
    });

    render(<RunWaypointPanel busId={10} direction="to_academy" />);

    await waitFor(() => expect(mockGetRuns).toHaveBeenCalled());

    const [addSelect] = screen.getAllByRole("combobox");
    const optionLabels = Array.from(addSelect.querySelectorAll("option")).map((option) => option.textContent);

    expect(optionLabels.some((label) => label?.includes("#1"))).toBe(true);
    expect(optionLabels.some((label) => label?.includes("#2"))).toBe(false);
    expect(optionLabels.some((label) => label?.includes("#3"))).toBe(false);
    expect(optionLabels.some((label) => label?.includes("#4"))).toBe(false);
  });
});

describe("RunWaypointPanel — 노선 전체 소요시간 비교 (`R18-C2` 목표 3)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const buildWaypointResult = (
    overrides: Partial<WaypointResultResponseTypes> = {},
  ): WaypointResultResponseTypes => ({
    waypointId: 5,
    routePreview: {
      stopsBefore: [{ seq: 1, stopName: "정문", eta: null }],
      stopsAfter: [{ seq: 1, stopName: "정문", eta: null }],
      reordered: [],
      removed: [],
      roadPathBefore: [],
      roadPathAfter: [],
    },
    estTimeBefore: null,
    estTimeAfter: null,
    estDistanceBefore: null,
    estDistanceAfter: null,
    estDurationBefore: 32,
    estDurationAfter: 38,
    applied: false,
    ...overrides,
  });

  it("미리보기를 받으면 노선 전체 소요를 분·증감 부호와 함께 보여준다", async () => {
    mockGetRuns.mockResolvedValue({
      items: [buildRun({ id: 1, busId: 10, direction: "to_academy", canceledAt: null })],
    });
    mockAddRunWaypoint.mockResolvedValue(buildWaypointResult());

    render(<RunWaypointPanel busId={10} direction="to_academy" />);
    await waitFor(() => expect(mockGetRuns).toHaveBeenCalled());

    const [addSelect] = screen.getAllByRole("combobox");
    fireEvent.change(addSelect, { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("표시명"), { target: { value: "임시 정류장" } });
    fireEvent.click(screen.getByRole("tab", { name: "좌표로 입력" }));
    fireEvent.change(screen.getByLabelText("위도"), { target: { value: "37.2" } });
    fireEvent.change(screen.getByLabelText("경도"), { target: { value: "127.2" } });

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    expect(await screen.findByText("32분 → 38분 (+6분)")).toBeInTheDocument();
  });
});
