import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { ChangeApprovalList } from "./ChangeApprovalList";
import { getChangeApprovals } from "../api";
import type { ChangeApprovalsResponseTypes } from "../types";

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("../api", () => ({
  getChangeApprovals: vi.fn(),
}));

const mockGetChangeApprovals = vi.mocked(getChangeApprovals);

const baseList: ChangeApprovalsResponseTypes = {
  items: [
    {
      approvalId: "5",
      source: "change_request",
      studentName: "이학생",
      runId: "10",
      busNo: "1호차",
      direction: "to_academy",
      deadlineAt: "2026-09-13T00:00:00Z",
      stopName: "정문",
      remainingRiders: 3,
      willRemoveStop: true,
      requestedAt: "2026-09-11T00:00:00Z",
    },
  ],
  pendingCount: 1,
  page: 0,
  size: 20,
  totalCount: 1,
  hasNext: false,
};

describe("ChangeApprovalList — 상태 필터", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("기본 조회는 pending 을 0 페이지·size 20 으로 요청한다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("이학생")).toBeInTheDocument();
    expect(mockGetChangeApprovals).toHaveBeenCalledWith("pending", 0, 20);
  });

  // §9.6 ChangeRequest.status 4종 전부가 필터로 열려 있는지 — 병합 `ab51f8f`(Ruling 264)로
  // 서버 500 이 해소돼 UI 로 가리던 이전 판단을 되돌린 자리다.
  it("거절·자동 거절 탭을 선택하면 각각의 status 로 0 페이지에서 재조회한다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);
    await screen.findByText("이학생");

    fireEvent.click(screen.getByRole("tab", { name: "거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("rejected", 0, 20);

    fireEvent.click(screen.getByRole("tab", { name: "자동 거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("auto_rejected", 0, 20);
  });

  // Ruling 358 — §5.5 목록 페이징. 다음 페이지 버튼은 같은 status 로 page+1 을 요청하고,
  // 그 뒤 상태 필터를 바꾸면 페이지가 0 으로 되돌아간다(옛 필터의 마지막 페이지가 새
  // 필터에서는 범위 밖일 수 있다 — 선례 NotificationList 와 같은 근거).
  it("다음 페이지 버튼은 page+1 로 재조회하고, 필터를 바꾸면 0 페이지로 되돌아간다", async () => {
    mockGetChangeApprovals.mockResolvedValue({ ...baseList, hasNext: true, totalCount: 25 });
    render(<ChangeApprovalList />);
    await screen.findByText("이학생");

    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("pending", 1, 20);

    fireEvent.click(screen.getByRole("tab", { name: "거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("rejected", 0, 20);
  });

  it("승하차지 삭제 예정 건은 삭제 예정 배지를 보여준다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("삭제 예정")).toBeInTheDocument();
  });
});

// F02-04 — 탭을 연달아 눌러 요청이 겹칠 때, 늦게 도착한 옛 응답이 새 탭의 목록을 덮으면 안 된다.
describe("ChangeApprovalList — F02-04 늦게 온 옛 응답", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("처리 대기 응답이 거절 응답보다 늦게 와도 표에는 거절 목록이 남는다", async () => {
    let resolvePending!: (value: ChangeApprovalsResponseTypes) => void;
    mockGetChangeApprovals.mockImplementationOnce(
      () => new Promise<ChangeApprovalsResponseTypes>((resolve) => (resolvePending = resolve)),
    );
    mockGetChangeApprovals.mockResolvedValueOnce({
      ...baseList,
      items: [{ ...baseList.items[0], approvalId: "6", studentName: "거절학생" }],
    });
    render(<ChangeApprovalList />);

    fireEvent.click(screen.getByText("거절"));
    await screen.findByText("거절학생");
    await act(async () => resolvePending(baseList));

    expect(screen.getByText("거절학생")).toBeInTheDocument();
    expect(screen.queryByText("이학생")).not.toBeInTheDocument();
  });
});

// B1 #5 — 처리 기한을 시각으로만 보여 주면 남은 시간을 알 수 없다. 대기 건은 자동 거절까지 남은 시간을 함께 보여 준다.
describe("ChangeApprovalList — 자동 거절까지 남은 시간", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("처리 대기 목록에는 '자동 거절까지' 열로 남은 시간을, 기한이 지난 건은 '기한 지남' 을 보여 준다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-12T23:45:00Z"));
    mockGetChangeApprovals.mockResolvedValue({
      ...baseList,
      items: [baseList.items[0]!, { ...baseList.items[0]!, approvalId: "6", studentName: "박학생", deadlineAt: "2026-09-12T23:00:00Z" }],
    });
    render(<ChangeApprovalList />);

    // 머리글은 응답이 오기 전에도 그려져 있다 — 행의 값을 기다려야 응답이 한 틱 늦어도 실패하지 않는다(20회 반복에서 1회 실패한 경합).
    expect(await screen.findByText("15분 0초 남음")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "자동 거절까지" })).toBeInTheDocument();
    expect(screen.getByText("기한 지남")).toBeInTheDocument();
  });

  it("처리가 끝난 목록(거절·승인)에는 남은 시간 열이 없다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);
    await screen.findByText("이학생");

    fireEvent.click(screen.getByRole("tab", { name: "승인 완료" }));

    await screen.findByText("이학생");
    expect(screen.queryByRole("columnheader", { name: "자동 거절까지" })).not.toBeInTheDocument();
  });
});

// R52 · Ruling 870 — 처리 기한(`deadline_at`)은 "운행 시작 또는 출발 10분 뒤 중 먼저 오는 시점" 이다. 출발 시각이 아니므로
// 화면은 그 값을 "출발" 로 부르지 않고 서버 값 그대로 "처리 기한" 으로 보인다.
describe("ChangeApprovalList — 처리 기한 표시(Ruling 870)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("마감 띠와 회차 묶음 머리줄이 deadline_at 시각을 '출발' 이 아닌 '처리 기한' 으로 적고, 머리 설명이 마감 규칙을 말한다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-12T23:45:00Z"));
    mockGetChangeApprovals.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0]!, deadlineAt: "2026-09-13T00:10:00Z" }], // 09:10 KST
    });
    render(<ChangeApprovalList />);

    expect(await screen.findByText(/1호차 · 등원 처리 기한 09:10 — 25분 0초 안에 처리하지 않으면 1건이 자동 거절됩니다/)).toBeInTheDocument();
    expect(screen.getByText("처리 기한 09:10 · 대기 1건")).toBeInTheDocument();
    expect(screen.queryByText(/09:10 출발/)).not.toBeInTheDocument();
    expect(screen.getByText(/출발 10분 뒤 또는 운행 시작 중 먼저 오는 때까지 처리하지 않으면 자동 거절됩니다/)).toBeInTheDocument();
  });
});
