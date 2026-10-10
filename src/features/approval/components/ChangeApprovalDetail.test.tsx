import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import type { MapSurfaceProps } from "@/features/map";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { ChangeApprovalDetail } from "./ChangeApprovalDetail";
import { decideChangeApproval, getChangeApprovalDetail } from "../api";
import type { ChangeApprovalDetailResponseTypes } from "../types";

// §5.6 은 approve=true 면 previewToken 이 필수다(불일치·만료는 409 PREVIEW_STALE) —
// 이 화면이 상세 조회로 받은 previewToken 을 그대로 승인 요청에 실어 보내는지가
// 핵심 검증 대상이다. reject 는 사유 없이 거절할 수 없다는 §8.3 규칙도 함께 본다.
const mockPush = vi.fn();
const mockRouter = createStableRouter({ push: mockPush });
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("../api", () => ({
  getChangeApprovalDetail: vi.fn(),
  decideChangeApproval: vi.fn(),
}));

// `R18-C` 목표 4(Ruling 319) — jsdom 은 실제 지도 SDK 를 못 그리므로(TodayRunPage.test.tsx
// 와 같은 한계) `MapSurface` 를 목으로 바꿔 이 화면이 계산한 polylines·camera 만 검증한다.
const mockMapSurface = vi.fn<(props: MapSurfaceProps) => null>(() => null);
vi.mock("@/features/map", () => ({
  MAP_SURFACE_HEIGHT: "480px",
  MapSurface: (props: MapSurfaceProps) => mockMapSurface(props),
}));

// 처리 직후 사이드바 배지를 바로 다시 세는지만 본다 — 배지를 세는 쪽은 ApprovalPendingProvider.test 가 맡는다.
const mockRefreshPending = vi.fn(async () => true);
vi.mock("./ApprovalPendingProvider", () => ({
  useApprovalPending: () => ({ refresh: mockRefreshPending }),
}));

const mockGetDetail = vi.mocked(getChangeApprovalDetail);
const mockDecide = vi.mocked(decideChangeApproval);

const baseDetail: ChangeApprovalDetailResponseTypes = {
  approvalId: "5",
  source: "change_request",
  studentName: "이학생",
  runId: "10",
  busNo: "1호차",
  direction: "to_academy",
  deadlineAt: "2026-09-13T00:00:00Z",
  departTime: null,
  stopName: "정문",
  remainingRiders: 3,
  willRemoveStop: false,
  requestedAt: "2026-09-11T00:00:00Z",
  routePreview: {
    stopsBefore: [{ seq: 1, stopName: "정문", eta: "08:10", lat: 37.55, lng: 126.97 }],
    stopsAfter: [{ seq: 1, stopName: "후문", eta: "08:15", lat: 37.57, lng: 126.99 }],
    reordered: [],
    removed: [],
    roadPathBefore: [
      { lat: 37.55, lng: 126.97 },
      { lat: 37.56, lng: 126.98 },
    ],
    roadPathAfter: [
      { lat: 37.55, lng: 126.97 },
      { lat: 37.57, lng: 126.99 },
    ],
  },
  estTimeBefore: "08:10",
  estTimeAfter: "08:15",
  estDistanceBefore: 12.3,
  estDistanceAfter: 14.1,
  estDurationBefore: 32,
  estDurationAfter: 38,
  affectedStudents: [{ studentId: "1", name: "이학생" }],
  capacity: { studentCapacity: 20, assigned: 12 },
  previewToken: "token-abc",
  previewStale: false,
  status: "pending",
  decidedAt: null,
  decidedByName: null,
  driverName: null,
  escortName: null,
};

// shouldAdvanceTime 을 쓰면 실제 시간이 흐르는 만큼 가짜 시계도 흘러, 기계가 바쁠 때 렌더가 1초 늦으면
// "12분 30초" 가 이미 "12분 29초" 로 바뀐다. 초 단위·기한 경계를 검사하는 시험은 시계를 멈춰 두고 손으로만 움직인다.
const flushPendingWork = () => act(() => vi.advanceTimersByTimeAsync(0));

describe("ChangeApprovalDetail — 승인/거절", () => {
  // baseDetail 의 기한(2026-09-13T00:00Z)이 실제 시계로는 이미 지났다 — 기한 지난 건은 버튼이 꺼지므로(FE2)
  // 기한 전 시각으로 시계를 고정한다.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-12T23:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("승인 시 상세 조회로 받은 previewToken 을 그대로 실어 보낸다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    mockDecide.mockResolvedValue({
      status: "approved",
      stopRemoved: false,
      routeVersion: 2,
      decidedBy: "staff-1",
      decidedAt: "2026-09-12T00:00:00Z",
    });
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(screen.getByRole("button", { name: "구간 변경 승인" }));

    await waitFor(() =>
      expect(mockDecide).toHaveBeenCalledWith("5", { approve: true, previewToken: "token-abc" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/change-approval");
  });

  it("거절 사유가 없으면 거절 확정 버튼이 비활성 상태다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "거절" }));

    expect(screen.getByRole("button", { name: "구간 변경 거절" })).toBeDisabled();
  });

  it("409 PREVIEW_STALE 응답을 받으면 오류 문구를 보여주고 상세를 다시 불러온다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    mockDecide.mockRejectedValue(new ApiError(409, "PREVIEW_STALE", "미리보기가 만료됐습니다"));
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(screen.getByRole("button", { name: "구간 변경 승인" }));

    expect(await screen.findByText("미리보기가 만료됐습니다")).toBeInTheDocument();
    await waitFor(() => expect(mockGetDetail).toHaveBeenCalledTimes(2));
  });

  // 이미 결정된 건(routePreview 등이 전부 null) — 실서버 계약 시험이 잡은 결함(보고서 §1·§2)의
  // 고정 시험. 이 널을 못 다루면 `stopsBefore` 접근에서 TypeError 로 렌더가 죽는다.
  it("이미 결정된 건(routePreview 가 null)은 노선 비교 대신 안내 문구를 보여주고 승인/거절 버튼을 감춘다", async () => {
    mockGetDetail.mockResolvedValue({
      ...baseDetail,
      routePreview: null,
      estTimeBefore: null,
      estTimeAfter: null,
      estDistanceBefore: null,
      estDistanceAfter: null,
      estDurationBefore: null,
      estDurationAfter: null,
      previewToken: null,
    });
    render(<ChangeApprovalDetail approvalId="5" />);

    expect(await screen.findByText("이미 결정된 건이라 노선 재계산 결과가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "거절" })).not.toBeInTheDocument();
  });

  // `R20-B` 목표 2·3·4(조율자 결정) — "변경 전/변경 후" 두 열에 전체 소요시간·출발시간·
  // 도착시간 3개만 낸다. 도착시간은 출발시간 + 전체 소요시간(분)의 파생값이라 새로
  // 계산하지 않는다. 화면 시각은 PC 시간대와 무관하게 서울 기준이므로(`clockTime.ts`) 기대값도
  // 서울 시각 문자열로 박는다 — 예전에는 기대값을 PC 시간대로 계산해, 시간대가 UTC 인
  // GitHub Actions 에서만 화면(17:00)과 기대값(08:00)이 어긋났다(R46-CIFIX).

  describe("소요 시간 비교(변경 전/후)", () => {
    const departTime = "2026-09-13T08:00:00Z"; // 서울 17:00

    it("전체 소요시간·출발시간·도착시간을 두 열에 나눠 보여주고, 소요시간 증감은 변경 후 열에만 부호로 낸다", async () => {
      mockGetDetail.mockResolvedValue({ ...baseDetail, departTime }); // 32분 → 38분
      render(<ChangeApprovalDetail approvalId="5" />);

      // 전체 소요시간 — 변경 전은 값만, 변경 후는 증감 부호를 덧붙인다.
      expect(await screen.findByText("32분")).toBeInTheDocument();
      expect(await screen.findByText("38분 (+6분)")).toBeInTheDocument();

      // 출발시간 — 재최적화가 출발 시각을 옮기지 않으므로 두 열에 같은 값이 나온다.
      // `R20-B2` 목표 2 — 같은 값이 버그로 읽히지 않도록 "전후 동일" 배지를 함께 낸다.
      expect(await screen.findAllByText("17:00")).toHaveLength(2);
      expect(await screen.findAllByText("전후 동일")).toHaveLength(2);

      // 도착시간 — 출발시간 + 전체 소요시간(분)의 파생값이라 전/후가 다르다.
      expect(await screen.findByText("17:32")).toBeInTheDocument(); // 17:00 + 32분
      expect(await screen.findByText("17:38")).toBeInTheDocument(); // 17:00 + 38분
    });

    it("줄어들면 - 부호로 보여준다", async () => {
      mockGetDetail.mockResolvedValue({ ...baseDetail, departTime, estDurationBefore: 40, estDurationAfter: 35 });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findByText("40분")).toBeInTheDocument();
      expect(await screen.findByText("35분 (-5분)")).toBeInTheDocument();
    });

    // R50 S7 — A-05 · UF-M-02 "전/후 예상 소요시간·거리". 거리(km, §5.5 est_distance_*)를 소요 시간과 같은 자리에 둔다.
    it("변경 전/후 예상 거리를 km 로 보이고 후에는 증감을 덧붙인다", async () => {
      mockGetDetail.mockResolvedValue({ ...baseDetail, departTime });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findByText("12.3km")).toBeInTheDocument();
      expect(await screen.findByText("14.1km (+1.8km)")).toBeInTheDocument();
    });

    it("거리 값이 없으면(null) 이유를 안내하고 화면은 그대로 그려진다", async () => {
      mockGetDetail.mockResolvedValue({ ...baseDetail, departTime, estDistanceBefore: null, estDistanceAfter: null });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findAllByText("- (거리 정보가 없습니다)")).toHaveLength(2);
      expect(screen.getByText("32분")).toBeInTheDocument();
    });

    it("옛 확정 노선이라 전체 소요시간이 없으면 이유를 한 줄 안내하고, 도착시간도 계산 불가로 안내한다", async () => {
      mockGetDetail.mockResolvedValue({ ...baseDetail, departTime, estDurationBefore: null });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findByText("- (예전 확정 노선이라 소요시간 정보가 없습니다)")).toBeInTheDocument();
      expect(await screen.findByText("- (출발 또는 소요 정보가 없어 계산할 수 없습니다)")).toBeInTheDocument();
      // 소요시간이 없는 쪽(before) 은 증감 계산의 기준값도 없다는 뜻이라, after 는 부호 없이 값만 낸다.
      expect(await screen.findByText("38분")).toBeInTheDocument();
    });

    it("departTime 이 아직 응답에 없으면(r20-a 미병합) 출발·도착시간에 이유를 안내한다", async () => {
      mockGetDetail.mockResolvedValue({ ...baseDetail, departTime: null });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findAllByText("- (출발 시각 정보가 아직 없습니다)")).toHaveLength(2);
      expect(await screen.findAllByText("- (출발 또는 소요 정보가 없어 계산할 수 없습니다)")).toHaveLength(2);
    });

    it("이미 결정된 건(routePreview 가 null)은 소요 시간 묶음 자체를 보여주지 않는다", async () => {
      mockGetDetail.mockResolvedValue({
        ...baseDetail,
        routePreview: null,
        estTimeBefore: null,
        estTimeAfter: null,
        estDistanceBefore: null,
        estDistanceAfter: null,
        estDurationBefore: null,
        estDurationAfter: null,
        previewToken: null,
      });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findByText("이미 결정된 건이라 노선 재계산 결과가 없습니다.")).toBeInTheDocument();
      expect(screen.queryByText("소요 시간")).not.toBeInTheDocument();
    });
  });

  // `R20-B2` 목표 1(사용자 지적) — "노선 비교" 정류장 목록의 도착예정시각도 이 화면의
  // 시간 표기다. 실제 응답은 초·밀리초·날짜까지 포함한 풀 ISO 를 주므로 시:분으로 줄인다.
  describe("노선 비교 정류장 시각", () => {
    it("풀 ISO 로 온 정류장 도착예정시각을 시:분으로 줄여 보여준다", async () => {
      const eta = "2026-09-19T12:55:41.464829Z"; // 서울 21:55
      mockGetDetail.mockResolvedValue({
        ...baseDetail,
        routePreview: {
          ...baseDetail.routePreview!,
          stopsAfter: [{ seq: 1, stopName: "그린빌라 입구", eta, lat: 37.5, lng: 127 }],
        },
      });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findByText("21:55")).toBeInTheDocument();
      expect(screen.queryByText(eta)).not.toBeInTheDocument();
    });

    it("도착예정시각이 없으면(결정 전 정류장) - 를 보여준다", async () => {
      mockGetDetail.mockResolvedValue({
        ...baseDetail,
        routePreview: {
          ...baseDetail.routePreview!,
          stopsBefore: [
            { seq: 1, stopName: "중앙로 스타빌딩 앞", eta: null as unknown as string, lat: null, lng: null },
          ],
        },
      });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findByText("중앙로 스타빌딩 앞", { exact: false })).toBeInTheDocument();
      expect(screen.getByText("1. 중앙로 스타빌딩 앞").closest("div")).toHaveTextContent("-");
    });
  });

  // `R18-C` 목표 4(Ruling 319) — 전후 경로를 좌우 두 지도로 나란히 그린다(한 지도에 겹치지 않는다).
  describe("전후 경로 지도", () => {
    it("도로 좌표를 좌우 두 지도에 각각의 폴리라인으로 그린다", async () => {
      mockGetDetail.mockResolvedValue(baseDetail);
      render(<ChangeApprovalDetail approvalId="5" />);

      await waitFor(() => expect(mockMapSurface).toHaveBeenCalledTimes(2));

      const [beforeCall, afterCall] = mockMapSurface.mock.calls;
      expect(beforeCall[0].polylines).toEqual([
        expect.objectContaining({ kind: "route", points: baseDetail.routePreview!.roadPathBefore }),
      ]);
      expect(afterCall[0].polylines).toEqual([
        expect.objectContaining({ kind: "route", points: baseDetail.routePreview!.roadPathAfter }),
      ]);
    });

    it("도로 좌표도 정차지 좌표도 없으면 지도 대신 안내 문구를 보여준다", async () => {
      mockGetDetail.mockResolvedValue({
        ...baseDetail,
        routePreview: {
          ...baseDetail.routePreview!,
          roadPathBefore: [],
          roadPathAfter: [],
          // R21-A 추가 지시 ② — 정차지 마커가 있으면 도로 좌표가 없어도 지도를 그린다(아래
          // 별도 시험). "안내 문구" 는 마커도 전혀 없을 때만 뜬다 — 여기서 정차지 좌표도 지운다.
          stopsBefore: [{ seq: 1, stopName: "정문", eta: "08:10", lat: null, lng: null }],
          stopsAfter: [{ seq: 1, stopName: "후문", eta: "08:15", lat: null, lng: null }],
        },
      });
      render(<ChangeApprovalDetail approvalId="5" />);

      expect(await screen.findAllByText("경로 좌표가 아직 없습니다")).toHaveLength(2);
      expect(mockMapSurface).not.toHaveBeenCalled();
    });

    // R21-A 추가 지시 ② — 옛 확정 노선 버전(도로 좌표 컬럼 도입 전)이라 road_path 는 비어도
    // 정차지 좌표는 있을 수 있다 — 그때도 지도는 그려지고 정차지 마커가 실린다.
    it("도로 좌표가 없어도 정차지 좌표가 있으면 지도를 그리고 정차지 마커를 싣는다", async () => {
      mockGetDetail.mockResolvedValue({
        ...baseDetail,
        routePreview: { ...baseDetail.routePreview!, roadPathBefore: [], roadPathAfter: [] },
      });
      render(<ChangeApprovalDetail approvalId="5" />);

      await waitFor(() => expect(mockMapSurface).toHaveBeenCalledTimes(2));
      const [beforeCall] = mockMapSurface.mock.calls;
      expect(beforeCall[0].polylines).toEqual([]);
      expect(beforeCall[0].markers).toEqual([
        { id: "stop-1-정문", lat: 37.55, lng: 126.97, kind: "stop", seq: 1, selected: false },
      ]);
    });

    // R21-A 추가 지시 ② — "변한 승하차지"(reordered·removed 에 실린 것)는 흰 테두리로 강조된다.
    it("변한 승하차지(삭제·순서 변경)는 마커에 selected:true 로 실린다", async () => {
      mockGetDetail.mockResolvedValue({
        ...baseDetail,
        routePreview: {
          ...baseDetail.routePreview!,
          removed: [{ stopId: "1", stopName: "정문", lat: 37.55, lng: 126.97 }],
        },
      });
      render(<ChangeApprovalDetail approvalId="5" />);

      await waitFor(() => expect(mockMapSurface).toHaveBeenCalledTimes(2));
      const [beforeCall] = mockMapSurface.mock.calls;
      expect(beforeCall[0].markers).toEqual([
        { id: "stop-1-정문", lat: 37.55, lng: 126.97, kind: "stop", seq: 1, selected: true },
      ]);
    });
  });
});

// R32-W7 — 처리 기한이 시각만 보여 남은 시간을 관리자가 머릿속으로 계산해야 했다(A-05).
describe("ChangeApprovalDetail — 처리 기한 남은 시간(R32-W7)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("처리 기한 옆에 남은 분·초를 보여주고 1초마다 줄어든다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T23:47:30Z"));
    mockGetDetail.mockResolvedValue(baseDetail); // 기한 2026-09-13T00:00:00Z

    render(<ChangeApprovalDetail approvalId="5" />);
    await flushPendingWork();

    expect(screen.getByText(/남은 시간 12분 30초/)).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText(/남은 시간 12분 29초/)).toBeInTheDocument();
  });

  it("기한이 지났으면 지났다고 알린다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-13T00:00:05Z"));
    mockGetDetail.mockResolvedValue(baseDetail);

    render(<ChangeApprovalDetail approvalId="5" />);

    expect(await screen.findByText(/처리 기한이 지났습니다/)).toBeInTheDocument();
  });
});

// R36-FE FE2 — 서버는 처리 기한에 자동 거절한다(Ruling 306). 기한이 지난 대기 건은 [승인]·[거절] 을 끈다.
describe("ChangeApprovalDetail — 기한이 지난 대기 건(R36-FE FE2)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const openAt = (iso: string) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(iso));
  };

  it("기한 전에는 [승인]·[거절] 이 켜져 있다", async () => {
    openAt("2026-09-12T23:47:30Z");
    mockGetDetail.mockResolvedValue(baseDetail);
    render(<ChangeApprovalDetail approvalId="5" />);

    expect(await screen.findByRole("button", { name: "승인" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "거절" })).toBeEnabled();
    expect(screen.queryByText("처리 기한이 지나 자동 거절됩니다")).not.toBeInTheDocument();
  });

  it("기한이 지났으면 두 버튼이 꺼지고 자동 거절 안내가 뜬다", async () => {
    openAt("2026-09-13T00:00:05Z");
    mockGetDetail.mockResolvedValue(baseDetail);
    render(<ChangeApprovalDetail approvalId="5" />);

    expect(await screen.findByText("처리 기한이 지나 자동 거절됩니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "거절" })).toBeDisabled();
  });

  it("화면을 열어 둔 채 시계가 기한을 넘으면 꺼진다", async () => {
    // 기한 2초 전 — 실제 시간이 함께 흐르면 부하로 느려진 사이 이미 지나 "켜져 있다" 검사가 어긋난다. 시계를 멈춰 둔다.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T23:59:58Z"));
    mockGetDetail.mockResolvedValue(baseDetail);
    render(<ChangeApprovalDetail approvalId="5" />);
    await flushPendingWork();

    expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(screen.getByText("처리 기한이 지나 자동 거절됩니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인" })).toBeDisabled();
  });

  it("이미 결정된 건은 기한이 지났어도 지금처럼 버튼과 안내가 없다", async () => {
    openAt("2026-09-13T00:00:05Z");
    mockGetDetail.mockResolvedValue({ ...baseDetail, routePreview: null, previewToken: null });
    render(<ChangeApprovalDetail approvalId="5" />);

    await screen.findByText(/처리 기한이 지났습니다/);
    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
    expect(screen.queryByText("처리 기한이 지나 자동 거절됩니다")).not.toBeInTheDocument();
  });
});

// R32-W8 — "새로고침 후 다시 확인" 안내에 누를 버튼이 없었고, 불러오기 실패에도 재시도가 없었다.
describe("ChangeApprovalDetail — 다시 불러오기(R32-W8)", () => {
  afterEach(() => vi.clearAllMocks());

  it("미리보기가 최신이 아니면 '다시 불러오기' 버튼이 상세를 다시 조회한다", async () => {
    mockGetDetail.mockResolvedValue({ ...baseDetail, previewStale: true });
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "다시 불러오기" }));

    await waitFor(() => expect(mockGetDetail).toHaveBeenCalledTimes(2));
  });

  it("상세 불러오기가 실패하면 '다시 불러오기' 버튼으로 재시도한다", async () => {
    mockGetDetail.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "서버 오류"));
    mockGetDetail.mockResolvedValueOnce(baseDetail);
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("이학생 구간 변경")).toBeInTheDocument();
  });
});

// F02-14 — 승인은 노선 재확정·승하차지 삭제를 일으키고 되돌릴 수 없다(재결정은 409). 거절·가입 승인처럼 확인 단계를 둔다.
describe("ChangeApprovalDetail — F02-14 승인 확인 단계", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-12T23:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("[승인] 을 눌러도 바로 확정되지 않고 [승인 확정] 을 눌러야 요청이 나간다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    mockDecide.mockResolvedValue({
      status: "approved", stopRemoved: false, routeVersion: 2, decidedBy: "staff-1", decidedAt: "2026-09-12T00:00:00Z",
    });
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));

    expect(mockDecide).not.toHaveBeenCalled();
    expect(screen.getByText("이 변경을 승인합니다")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "구간 변경 승인" }));
    await waitFor(() => expect(mockDecide).toHaveBeenCalledTimes(1));
  });

  it("승하차지가 삭제되는 건은 확인 문구에 삭제될 곳 수를 보이고, [뒤로] 로 확인을 접는다", async () => {
    mockGetDetail.mockResolvedValue({
      ...baseDetail,
      willRemoveStop: true,
      routePreview: {
        ...baseDetail.routePreview!,
        removed: [{ stopId: "2", stopName: "후문", lat: 37.5, lng: 127.0 }],
      },
    });
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    expect(screen.getByText("이 변경을 승인합니다 (삭제 예정 승하차지 1곳)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "뒤로" }));
    expect(screen.getByRole("button", { name: "승인" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "구간 변경 승인" })).not.toBeInTheDocument();
  });
});

// F02-06 — 다른 관계자가 먼저 결정했거나 기한이 지난 뒤 결정하면 서버가 거절한다. 옛 화면에 버튼이 그대로 남으면 같은 오류가 반복된다.
describe("ChangeApprovalDetail — F02-06 결정 실패 뒤 최신 상태로", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-12T23:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const decided = { ...baseDetail, routePreview: null, previewToken: null };

  it("409 APPROVAL_ALREADY_DECIDED 면 한국어 안내를 보이고 상세를 다시 불러와 승인·거절 버튼이 사라진다", async () => {
    mockGetDetail.mockResolvedValueOnce(baseDetail).mockResolvedValueOnce(decided);
    mockDecide.mockRejectedValue(new ApiError(409, "APPROVAL_ALREADY_DECIDED", "Already decided"));
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(screen.getByRole("button", { name: "구간 변경 승인" }));

    expect(await screen.findByText("이미 다른 관계자가 처리한 요청입니다 — 최신 상태로 새로 불러옵니다")).toBeInTheDocument();
    await waitFor(() => expect(mockGetDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument());
  });

  it("거절에서도 403 CHANGE_WINDOW_CLOSED 면 안내 후 상세를 다시 불러온다", async () => {
    mockGetDetail.mockResolvedValueOnce(baseDetail).mockResolvedValueOnce(decided);
    mockDecide.mockRejectedValue(new ApiError(403, "CHANGE_WINDOW_CLOSED", "지금은 변경할 수 없는 시간입니다"));
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "거절" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "사유" } });
    fireEvent.click(screen.getByRole("button", { name: "구간 변경 거절" }));

    expect(await screen.findByText("처리할 수 있는 시간이 지났습니다 — 기한이 지나 자동 거절됐거나 운행이 시작됐습니다")).toBeInTheDocument();
    await waitFor(() => expect(mockGetDetail).toHaveBeenCalledTimes(2));
  });
});

// 구간 변경 대기 건수는 새 신청이 올 때만 실시간으로 갱신된다 — 승인·거절로 줄어드는 것은 처리한 화면이 다시 세게 해야 한다.
describe("ChangeApprovalDetail — 처리 직후 사이드바 배지 갱신", () => {
  // 기한 지난 건은 버튼이 꺼지므로 위 묶음과 같이 기한 전 시각으로 시계를 고정한다.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-12T23:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const decidedResponse = {
    status: "approved" as const,
    stopRemoved: false,
    routeVersion: 2,
    decidedBy: "staff-1",
    decidedAt: "2026-09-12T00:00:00Z",
  };

  it("승인하면 배지를 다시 센다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    mockDecide.mockResolvedValue(decidedResponse);
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(screen.getByRole("button", { name: "구간 변경 승인" }));

    await waitFor(() => expect(mockRefreshPending).toHaveBeenCalledTimes(1));
  });

  it("거절하면 배지를 다시 센다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    mockDecide.mockResolvedValue({ ...decidedResponse, status: "rejected" });
    render(<ChangeApprovalDetail approvalId="5" />);

    fireEvent.click(await screen.findByRole("button", { name: "거절" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "사유" } });
    fireEvent.click(screen.getByRole("button", { name: "구간 변경 거절" }));

    await waitFor(() => expect(mockRefreshPending).toHaveBeenCalledTimes(1));
  });
});

// R52 · Ruling 870 — 처리 기한은 서버의 `deadline_at` 이다(출발 10분 뒤, 운행이 먼저 시작되면 그 시점). 출발 시각에서 다시 계산하지 않고 "(출발 시각)" 이라 부르지도 않는다.
describe("ChangeApprovalDetail — 처리 기한 표시(Ruling 870)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("처리 기한 칸은 출발 시각이 아니라 deadline_at 시각을 보이고 마감 규칙을 적는다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-12T23:47:30Z"));
    // 출발 08:50 KST · 처리 기한 09:00 KST(출발 + 10분)
    mockGetDetail.mockResolvedValue({ ...baseDetail, source: "intent", departTime: "2026-09-12T23:50:00Z", deadlineAt: "2026-09-13T00:00:00Z" });

    render(<ChangeApprovalDetail approvalId="5" />);

    expect(await screen.findByText(/09:00 \(출발 10분 뒤 또는 운행 시작 중 먼저 오는 때\)/)).toBeInTheDocument();
    // R52 haiku A-3 — 접수 출처 라벨은 사양 용어(등하원 토글)다.
    expect(screen.getByText("09:00 · 등하원 토글")).toBeInTheDocument();
    expect(screen.getAllByText("등하원 토글")).toHaveLength(1); // 요청 유형 칸
    expect(screen.queryByText(/예고/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(출발 시각\)/)).not.toBeInTheDocument();
    expect(screen.getByText(/처리 기한 09:00 — 남은 시간 12분 30초/)).toBeInTheDocument();
  });
});
