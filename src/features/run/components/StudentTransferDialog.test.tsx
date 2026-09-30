import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { StudentTransferDialog } from "./StudentTransferDialog";
import { postTransfer } from "../api";
import { getRunRoute } from "@/features/route";
import type { DashboardRunResponseTypes, RosterItemResponseTypes, TransferResponseTypes } from "../types";

// §5.8 POST /staff/students/{id}/transfer(A-07) — 이 화면의 핵심 검증은 세 가지다:
// (1) stop_id·address 배타 — 고른 갈래의 값만 요청에 실린다
// (2) 대기 저장 — "이동 완료"가 아니라 확정 때 반영된다는 안내와 impact 가 보인다
// (3) 에러 5종 — 코드마다 쉬운 한국어 문구(CAPACITY_EXCEEDED 는 현재 인원·정원 병기)
vi.mock("../api", () => ({
  postTransfer: vi.fn(),
}));
vi.mock("@/features/route", () => ({
  getRunRoute: vi.fn(),
}));

const mockPostTransfer = vi.mocked(postTransfer);
const mockGetRunRoute = vi.mocked(getRunRoute);

const makeRun = (runId: string, busNo: string): DashboardRunResponseTypes => ({
  runId,
  busNo,
  direction: "to_academy",
  departTime: "08:10",
  startedAt: null,
  finishedAt: null,
  estArrivalTime: null,
  driverName: null,
  escortName: null,
  boardedCount: 0,
  totalCount: 6,
  runStatus: "idle",
  addedCount: 0,
  removedCount: 0,
  ackDriver: false,
  ackEscort: false,
  noShowCases: [],
});

const fromRun = makeRun("7", "2호차");
const candidates = [makeRun("8", "3호차"), makeRun("9", "4호차")];
const student: RosterItemResponseTypes = {
  studentId: "11",
  name: "김학생",
  className: "1반",
  stopName: "정문",
  transferId: null,
  guardianPhone: null,
  change: null,
  status: "waiting",
  note: null,
};

const staged: TransferResponseTypes = {
  transferId: "1",
  studentId: "11",
  fromRunId: "7",
  toRunId: "8",
  stopId: "5",
  status: "staged",
  impact: {
    from: { riderCountBefore: 6, riderCountAfter: 5 },
    to: { riderCountBefore: 3, riderCountAfter: 4, capacity: 10 },
  },
};

const routeWithStops = {
  roadPath: [],
  fallbackUsed: false,
  confirmed: false,
  stops: [
    { stopId: "5", seq: 1, name: "후문", lat: 37.5, lng: 127.0 },
    { stopId: "6", seq: 2, name: "학원", lat: 37.6, lng: 127.1, isDestination: true },
  ],
};

const renderDialog = (overrides: { onDone?: () => void; runs?: DashboardRunResponseTypes[] } = {}) =>
  render(
    <StudentTransferDialog
      student={student}
      fromRun={fromRun}
      candidateRuns={overrides.runs ?? candidates}
      onClose={vi.fn()}
      onDone={overrides.onDone ?? vi.fn()}
    />,
  );

// 도착 회차를 고르면 그 노선의 승하차지가 불려 온다.
const pickDestination = async (runId = "8") => {
  fireEvent.change(screen.getByLabelText("도착 회차"), { target: { value: runId } });
  await waitFor(() => expect(mockGetRunRoute).toHaveBeenCalledWith(runId));
};

describe("StudentTransferDialog — 배타 입력·대기 저장·에러", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("도착 회차를 고르면 그 회차 노선의 승하차지를 고를 수 있고 학원(도착지)은 빠진다", async () => {
    mockGetRunRoute.mockResolvedValue(routeWithStops);
    renderDialog();

    await pickDestination();

    expect(await screen.findByRole("option", { name: "후문" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "학원" })).not.toBeInTheDocument();
  });

  it("기존 승하차지를 고르면 stopId 만 싣고 address 는 undefined 다", async () => {
    mockGetRunRoute.mockResolvedValue(routeWithStops);
    mockPostTransfer.mockResolvedValue(staged);
    renderDialog();

    await pickDestination();
    await screen.findByRole("option", { name: "후문" });
    fireEvent.change(screen.getByLabelText("승하차지"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(mockPostTransfer).toHaveBeenCalledWith("11", {
        fromRunId: "7",
        toRunId: "8",
        stopId: "5",
        address: undefined,
        note: undefined,
      }),
    );
  });

  it("주소 입력 갈래로 바꾸면 address 만 싣고 stopId 는 undefined 다 — 비고는 함께 간다", async () => {
    mockGetRunRoute.mockResolvedValue(routeWithStops);
    mockPostTransfer.mockResolvedValue(staged);
    renderDialog();

    await pickDestination();
    fireEvent.click(screen.getByRole("tab", { name: "주소 입력" }));
    fireEvent.change(screen.getByLabelText("승하차 주소"), { target: { value: "서울시 후문로 2" } });
    fireEvent.change(screen.getByLabelText("비고"), { target: { value: "오늘만" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(mockPostTransfer).toHaveBeenCalledWith("11", {
        fromRunId: "7",
        toRunId: "8",
        stopId: undefined,
        address: "서울시 후문로 2",
        note: "오늘만",
      }),
    );
  });

  // 승하차지를 골랐다가 주소 탭으로 바꿔 입력해도 앞서 고른 stop_id 는 실리지 않아야 한다(§5.8 배타).
  it("승하차지를 고른 뒤 주소 갈래로 바꾸면 앞서 고른 stopId 는 싣지 않는다", async () => {
    mockGetRunRoute.mockResolvedValue(routeWithStops);
    mockPostTransfer.mockResolvedValue(staged);
    renderDialog();

    await pickDestination();
    await screen.findByRole("option", { name: "후문" });
    fireEvent.change(screen.getByLabelText("승하차지"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("tab", { name: "주소 입력" }));
    fireEvent.change(screen.getByLabelText("승하차 주소"), { target: { value: "서울시 후문로 2" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockPostTransfer).toHaveBeenCalledTimes(1));
    expect(mockPostTransfer.mock.calls[0][1]).toMatchObject({ stopId: undefined, address: "서울시 후문로 2" });
  });

  it("도착 회차·승하차지(또는 주소)를 고르기 전에는 저장할 수 없다", async () => {
    mockGetRunRoute.mockResolvedValue(routeWithStops);
    renderDialog();

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    await pickDestination();
    await screen.findByRole("option", { name: "후문" });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("승하차지"), { target: { value: "5" } });
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  });

  it("저장하면 이동 완료가 아니라 확정 때 반영된다고 알리고 양쪽 인원 전후·정원을 보여 준다", async () => {
    mockGetRunRoute.mockResolvedValue(routeWithStops);
    mockPostTransfer.mockResolvedValue(staged);
    const onDone = vi.fn();
    renderDialog({ onDone });

    await pickDestination();
    await screen.findByRole("option", { name: "후문" });
    fireEvent.change(screen.getByLabelText("승하차지"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText(/이동을 저장했습니다/)).toBeInTheDocument();
    expect(screen.getByText(/출발 30분 전 확정 때 반영/)).toBeInTheDocument();
    expect(screen.queryByText(/이동 완료/)).not.toBeInTheDocument();
    expect(screen.getByText("6명 → 5명")).toBeInTheDocument();
    expect(screen.getByText("3명 → 4명 (정원 10명)")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("옮길 수 있는 다른 회차가 없으면 그렇게 안내하고 저장할 수 없다", () => {
    renderDialog({ runs: [] });

    expect(screen.getByText("같은 방향으로 옮길 수 있는 다른 버스 회차가 없습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it.each([
    [403, "CHANGE_WINDOW_CLOSED", undefined, "출발 30분 전이 지나 이미 확정된 회차가 있어 옮길 수 없습니다"],
    [409, "RUN_CANCELED", undefined, "취소된 회차가 있어 옮길 수 없습니다"],
    [409, "CAPACITY_EXCEEDED", { current: 10, capacity: 10 }, "도착 버스가 가득 차 옮길 수 없습니다 (현재 10명 / 정원 10명)"],
    [409, "STUDENT_NOT_IN_RUN", undefined, "이 학생이 출발 버스 명단에 없습니다"],
    [409, "TRANSFER_ALREADY_STAGED", undefined, "이 학생은 이미 옮기기로 저장된 건이 있습니다"],
    [409, "STUDENT_ALREADY_IN_RUN", undefined, "이 학생은 이미 도착 회차 명단에 있어 옮길 수 없습니다"],
  ])("%i %s 는 쉬운 문구로 보여 주고 영문 코드는 화면에 내지 않는다", async (status, code, details, message) => {
    mockGetRunRoute.mockResolvedValue(routeWithStops);
    mockPostTransfer.mockRejectedValue(new ApiError(status, code, "서버 원문", details));
    renderDialog();

    await pickDestination();
    await screen.findByRole("option", { name: "후문" });
    fireEvent.change(screen.getByLabelText("승하차지"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(code)).not.toBeInTheDocument();
    expect(screen.queryByText("서버 원문")).not.toBeInTheDocument();
  });
});

// C00-02 — 도착 회차에 고정 노선이 없으면 §5.19 가 `409 RUN_NOT_CONFIRMED` 를 준다. 예전엔 catch 가
// 목록을 말없이 비워, 관계자는 목록이 고장 난 줄 알았다.
describe("StudentTransferDialog — 도착 회차의 승하차지 조회 실패(C00-02)", () => {
  afterEach(() => vi.clearAllMocks());

  it("고정 노선이 없는 회차(RUN_NOT_CONFIRMED)면 이유를 알리고 주소 입력으로 바꾼다", async () => {
    mockGetRunRoute.mockRejectedValue(new ApiError(409, "RUN_NOT_CONFIRMED", "서버 원문"));
    renderDialog();

    await pickDestination();

    expect(await screen.findByText("이 회차는 고정 노선이 없어 주소로만 지정할 수 있습니다")).toBeInTheDocument();
    expect(screen.getByLabelText("승하차 주소")).toBeInTheDocument();
  });

  it("그 밖의 조회 실패는 목록이 빈 이유를 오류 문구로 알린다", async () => {
    mockGetRunRoute.mockRejectedValue(new ApiError(500, "INTERNAL", "서버 원문"));
    renderDialog();

    await pickDestination();

    expect(await screen.findByText("승하차지 목록을 불러오지 못했습니다. 주소로 지정하거나 다시 골라 주세요")).toBeInTheDocument();
  });
});
