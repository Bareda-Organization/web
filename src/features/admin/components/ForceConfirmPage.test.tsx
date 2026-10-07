import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForceConfirmPage } from "./ForceConfirmPage";
import { getAcademyRunsLive, getAllAcademies, getRunAttention } from "../api";
import type { RunLiveItemResponseTypes } from "../types";

// W4 — 확정이 계속 실패하는 회차를 강제 확정 대상 목록에서 바로 알아본다
// (`API_SPEC §6.8` `consecutive_failures`, BR-047 · `UF-O-07`). 0(성공)이면
// 표시하지 않는다 — `RunDayList.test.tsx` 와 같은 판단.
vi.mock("../api", () => ({
  getAllAcademies: vi.fn(),
  getAcademyRunsLive: vi.fn(),
  getRunAttention: vi.fn(),
}));

const mockGetAcademies = vi.mocked(getAllAcademies);
const mockGetRunsLive = vi.mocked(getAcademyRunsLive);
const mockGetAttention = vi.mocked(getRunAttention);

beforeEach(() => mockGetAttention.mockResolvedValue({ items: [] }));

const baseRun: RunLiveItemResponseTypes = {
  runId: "42",
  busNo: "701호",
  direction: "to_academy",
  runStatus: "idle",
  position: null,
  lastSeenAt: null,
  departTime: "08:00",
  confirmAt: "07:30",
  estDepartTime: "08:00",
  stops: [],
  destinationEta: null,
  driver: null,
  escort: null,
  consecutiveFailures: 0,
};

describe("ForceConfirmPage — W4 연속 실패 표시", () => {
  it("consecutiveFailures 가 0 보다 크면 확정 N회 연속 실패 문구를 보여준다", async () => {
    mockGetAcademies.mockResolvedValue([{ id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" }]);
    mockGetRunsLive.mockResolvedValue({ runs: [{ ...baseRun, consecutiveFailures: 4 }] });

    render(<ForceConfirmPage />);

    expect(await screen.findByText("확정 4회 연속 실패")).toBeInTheDocument();
  });

  it("consecutiveFailures 가 0 이면 문구를 보여주지 않는다", async () => {
    mockGetAcademies.mockResolvedValue([{ id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" }]);
    mockGetRunsLive.mockResolvedValue({ runs: [baseRun] });

    render(<ForceConfirmPage />);

    await screen.findByText("701호");
    expect(screen.queryByText(/연속 실패/)).not.toBeInTheDocument();
  });
});

// F03-04 — 학원 선택 목록이 첫 쪽(20곳)만 받으면 21번째 이후 학원의 회차는 강제 확정을 못 한다.
describe("ForceConfirmPage — 학원 선택 목록은 전체 학원", () => {
  it("21번째 이후 학원도 선택 목록에 있다", async () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      id: String(index + 1), code: `A${index + 1}`, name: `학원${index + 1}`, region: "서울", staffCount: 1, userCount: 1, status: "active" as const,
    }));
    mockGetAcademies.mockResolvedValue(many);
    mockGetRunsLive.mockResolvedValue({ runs: [] });

    render(<ForceConfirmPage />);

    expect(await screen.findByRole("tab", { name: /학원25/ })).toBeInTheDocument();
  });
});

// F03-11 — "확정 예정" 열은 출발 예정 시각(est_depart_time)도 출발 시각도 아니라 확정 판정 시각(confirm_at =
// 출발−30분)이어야 한다(Ruling 393). 세 시각이 서로 다른 값이어야 어느 필드를 읽는지 갈린다.
describe("ForceConfirmPage — 열 이름", () => {
  it("'확정 예정' 열이 confirm_at 값을 보여 주고 출발 시각과 따로 있으며, 출발 예정(추정)은 확정 예정으로 읽히지 않는다", async () => {
    mockGetAcademies.mockResolvedValue([{ id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const }]);
    mockGetRunsLive.mockResolvedValue({
      runs: [{
        ...baseRun,
        departTime: "2026-09-30T08:00:00+09:00",
        confirmAt: "2026-09-30T07:30:00+09:00",
        estDepartTime: "2026-09-30T08:05:00+09:00",
      }],
    });

    render(<ForceConfirmPage />);

    const row = (await screen.findByText("701호")).closest("tr") as HTMLElement;
    expect(screen.getByText("출발 시각")).toBeInTheDocument();
    expect(screen.getByText("확정 예정")).toBeInTheDocument();
    expect(within(row).getByText("07:30")).toBeInTheDocument(); // 확정 예정 = confirm_at
    expect(within(row).getByText("08:00")).toBeInTheDocument(); // 출발 시각
    expect(within(row).queryByText("08:05")).not.toBeInTheDocument(); // est_depart_time 은 확정 예정이 아니다(Ruling 393)
  });
});

// F03-09(c) — 학원을 바꿨는데 옛 학원의 대기 회차 응답이 늦게 오면 다른 학원 회차에 "강제 확정" 을 누를 수 있다.
describe("ForceConfirmPage — 늦은 응답이 새 학원 선택을 덮지 않음", () => {
  it("학원을 A→B 로 바꾼 뒤 A 의 응답이 늦게 와도 B 의 회차만 보인다", async () => {
    const base = { code: "C", region: "서울", staffCount: 1, userCount: 1, status: "active" as const };
    mockGetAcademies.mockResolvedValue([{ id: "1", name: "가 학원", ...base }, { id: "2", name: "나 학원", ...base }]);
    let resolveA: (value: { runs: (typeof baseRun)[] }) => void = () => {};
    mockGetRunsLive.mockImplementation((academyId: string) =>
      academyId === "1"
        ? new Promise((resolve) => (resolveA = resolve))
        : Promise.resolve({ runs: [{ ...baseRun, runId: "20", busNo: "B학원 버스" }] }),
    );
    render(<ForceConfirmPage />);
    await waitFor(() => expect(mockGetRunsLive).toHaveBeenCalledWith("1"));

    fireEvent.click(screen.getByRole("tab", { name: /나 학원/ }));
    expect(await screen.findByText("B학원 버스")).toBeInTheDocument();
    await act(async () => {
      resolveA({ runs: [{ ...baseRun, runId: "10", busNo: "A학원 버스" }] });
    });

    expect(screen.queryByText("A학원 버스")).not.toBeInTheDocument();
    expect(screen.getByText("B학원 버스")).toBeInTheDocument();
  });
});

// R48 시안 `force-confirm` — 확정 예정 시각(confirm_at)이 지난 회차만 강제 확정 대상이고, 아직이면 단추가 꺼진 채 "HH:mm 부터 가능"(U-03).
describe("ForceConfirmPage — 대상과 대기 두 묶음(U-03)", () => {
  const academy = { id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const };

  it("confirm_at 이 지난 회차는 강제 확정 단추가 켜지고, 아직인 회차는 '부터 가능' 꺼진 단추다", async () => {
    mockGetAcademies.mockResolvedValue([academy]);
    mockGetRunsLive.mockResolvedValue({
      runs: [
        { ...baseRun, runId: "1", busNo: "지난호", confirmAt: "2020-01-01T07:30:00+09:00", departTime: "2020-01-01T08:00:00+09:00", consecutiveFailures: 3 },
        { ...baseRun, runId: "2", busNo: "앞날호", confirmAt: "2099-01-01T14:23:00+09:00", departTime: "2099-01-01T14:53:00+09:00" },
      ],
    });
    render(<ForceConfirmPage />);

    const due = await screen.findByRole("button", { name: "지난호 강제 확정" });
    expect(due).toBeEnabled();
    const waiting = screen.getByRole("button", { name: "앞날호 강제 확정 — 14:23 부터 가능" });
    expect(waiting).toBeDisabled();
    expect(waiting).toHaveTextContent("14:23 부터 가능");
    expect(screen.getByText("강제 확정 대상")).toBeInTheDocument();
    expect(screen.getByText("확정 예정 전 대기 회차")).toBeInTheDocument();
  });

  it("확정이 연속 실패한 대상이 있으면 상단 띠가 그 회차와 실패 횟수를 알린다", async () => {
    mockGetAcademies.mockResolvedValue([academy]);
    mockGetRunsLive.mockResolvedValue({
      runs: [{ ...baseRun, busNo: "2호차", direction: "from_academy", confirmAt: "2020-01-01T07:30:00+09:00", departTime: "2020-01-01T08:00:00+09:00", consecutiveFailures: 3 }],
    });
    render(<ForceConfirmPage />);

    expect(await screen.findByText(/확정이 3회 연속 실패한 회차 1건/)).toBeInTheDocument();
  });

  // R50 M7 — "7분 지남했습니다" 처럼 '지남' 에 '했습니다' 가 붙던 문장. 지난 시간을 괄호로 적는다.
  it("상단 띠는 확정 예정 시각이 얼마나 지났는지 어색한 활용 없이 적는다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T07:37:00+09:00"));
    try {
      mockGetAcademies.mockResolvedValue([academy]);
      mockGetRunsLive.mockResolvedValue({
        runs: [{ ...baseRun, confirmAt: "2026-10-03T07:30:00+09:00", departTime: "2026-10-03T08:00:00+09:00", consecutiveFailures: 3 }],
      });
      render(<ForceConfirmPage />);

      expect(await screen.findByText(/확정 예정 07:30 \(7분 지남\)/)).toBeInTheDocument();
      expect(screen.queryByText(/지남했습니다/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("학원 칩에 확정 실패 회차 수를 붙인다(§6.15)", async () => {
    mockGetAcademies.mockResolvedValue([academy]);
    mockGetAttention.mockResolvedValue({ items: [{ academyId: "1", delayedRuns: 0, confirmFailedRuns: 2 }] });
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    render(<ForceConfirmPage />);

    expect(await screen.findByRole("tab", { name: "테스트 학원 · 실패 2" })).toBeInTheDocument();
  });
});

describe("ForceConfirmPage — 처음 고르는 학원", () => {
  it("목록 맨 앞이 비활성 학원이어도 첫 운영 중 학원의 회차부터 읽는다", async () => {
    const base = { code: "C", region: "서울", staffCount: 1, userCount: 1 };
    mockGetAcademies.mockResolvedValue([
      { id: "1", name: "비활성 학원", status: "inactive" as const, ...base },
      { id: "2", name: "운영 학원", status: "active" as const, ...base },
    ]);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    render(<ForceConfirmPage />);

    await waitFor(() => expect(mockGetRunsLive).toHaveBeenCalledWith("2"));
    expect(mockGetRunsLive).not.toHaveBeenCalledWith("1");
  });
});
