import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunWaypointPanel } from "./RunWaypointPanel";
import { getRuns } from "@/features/schedule";
import type { RunItemResponseTypes } from "@/features/schedule";
import { addRunWaypoint } from "../api";
import type { WaypointResultResponseTypes } from "../types";
import type { MapSurfaceProps } from "@/features/map";

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

// jsdom 에 지도 SDK 가 없다 — 다른 화면 시험과 같은 이유로 MapSurface 를 목으로 바꿔
// "무엇을 그리라고 넘겼는가" 만 본다.
const mapProps: MapSurfaceProps[] = [];
vi.mock("@/features/map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/map")>();
  return { ...actual, MapSurface: (props: MapSurfaceProps) => { mapProps.push(props); return null; } };
});

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

// 사용자 지시(2026-09-22) — ⑤경유 지점이 **설 자리**를 고를 수 있어야 하고, ⑥미리보기는
// 기존 경로(좌)와 변경된 경로(우)를 **두 지도로** 나란히 보여줘야 한다.
describe("RunWaypointPanel — 설 자리 지정 · 전후 지도 비교", () => {
  afterEach(() => {
    mapProps.length = 0;
    vi.clearAllMocks();
  });

  const basePreview: WaypointResultResponseTypes = {
    waypointId: 5,
    routePreview: {
      stopsBefore: [{ seq: 1, stopName: "정문", eta: null }],
      stopsAfter: [{ seq: 1, stopName: "임시 경유", eta: null }],
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
  };

  const 미리보기_준비 = async () => {
    mockGetRuns.mockResolvedValue({ items: [buildRun({ id: 7, status: "confirmed" })] });
    render(<RunWaypointPanel busId={10} direction="to_academy" />);
    // 이 화면에는 회차 선택이 둘이다(경유 지점 추가 · 배포된 경유 지점 제거) — 첫 번째가 추가 쪽이다.
    await waitFor(() => expect(screen.getAllByRole("option", { name: /#7/ }).length).toBeGreaterThan(0));
    fireEvent.change(screen.getAllByLabelText("회차")[0], { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "서울시 새길로 7" } });
    fireEvent.change(screen.getByLabelText("표시명"), { target: { value: "임시 경유" } });
  };

  // 2026-09-22 화면 확인 — 예상 시각이 `2026-09-22T07:24:12.642407Z` 그대로 나왔다.
  // 표·카드가 쓰는 형식(HH:MM)과 같아야 관계자가 두 값을 나란히 읽을 수 있다.
  it("예상 시각을 시:분으로 보여준다 — ISO 문자열 그대로가 아니라", async () => {
    await 미리보기_준비();
    mockAddRunWaypoint.mockResolvedValue({
      ...basePreview,
      estTimeBefore: "2026-09-22T07:10:00Z",
      estTimeAfter: "2026-09-22T07:24:12.642407Z",
    });

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    const local = new Date("2026-09-22T07:24:12.642407Z").toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    expect(await screen.findByText(new RegExp(local))).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-22T07:24/)).not.toBeInTheDocument();
  });

  it("설 자리를 고르면 요청에 그 순번이 실린다", async () => {
    await 미리보기_준비();
    mockAddRunWaypoint.mockResolvedValue({ ...basePreview, waypointId: 5 });

    fireEvent.change(screen.getByLabelText("설 자리"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    await waitFor(() =>
      expect(mockAddRunWaypoint).toHaveBeenCalledWith(7, expect.objectContaining({ seq: 1, apply: false })),
    );
  });

  it("미리보기는 변경 전·후 경로를 지도 두 개로 보여준다", async () => {
    await 미리보기_준비();
    mockAddRunWaypoint.mockResolvedValue({
      ...basePreview,
      waypointId: 5,
      routePreview: {
        ...basePreview.routePreview,
        roadPathBefore: [{ lat: 37.1, lng: 127.1 }, { lat: 37.2, lng: 127.2 }],
        roadPathAfter: [{ lat: 37.1, lng: 127.1 }, { lat: 37.3, lng: 127.3 }],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    await waitFor(() => expect(mapProps.length).toBeGreaterThanOrEqual(2));
    const drawn = mapProps.map((props) => props.polylines?.[0]?.points.length ?? 0);
    expect(drawn.filter((count) => count === 2)).toHaveLength(2);
    // "변경 전/후" 는 지도 머리글과 숫자 비교 양쪽에 나온다 — 둘 다 있는 것이 정상이다.
    expect(screen.getAllByText("변경 전").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("변경 후").length).toBeGreaterThanOrEqual(2);
  });
});
