import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForceConfirmPage } from "./ForceConfirmPage";
import { getAcademyRunsLive, getAllAcademies } from "../api";
import type { RunLiveItemResponseTypes } from "../types";

// W4 — 확정이 계속 실패하는 회차를 강제 확정 대상 목록에서 바로 알아본다
// (`API_SPEC §6.8` `consecutive_failures`, BR-047 · `UF-O-07`). 0(성공)이면
// 표시하지 않는다 — `RunDayList.test.tsx` 와 같은 판단.
vi.mock("../api", () => ({
  getAllAcademies: vi.fn(),
  getAcademyRunsLive: vi.fn(),
}));

const mockGetAcademies = vi.mocked(getAllAcademies);
const mockGetRunsLive = vi.mocked(getAcademyRunsLive);

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

    expect(await screen.findByRole("option", { name: "학원25 (서울)" })).toBeInTheDocument();
  });
});

// F03-11 — "확정 예정" 열은 출발 예정 시각(est_depart_time)도 출발 시각도 아니라 확정 판정 시각(confirm_at =
// 출발−30분)이어야 한다(Ruling 393). 세 시각이 서로 다른 값이어야 어느 필드를 읽는지 갈린다.
describe("ForceConfirmPage — 열 이름", () => {
  it("'확정 예정' 열이 confirm_at 값을 보여 주고 출발 시각·출발 예정(추정)과 따로 있다", async () => {
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

    expect(await screen.findByText("출발 시각")).toBeInTheDocument();
    expect(screen.getByText("출발 예정(추정)")).toBeInTheDocument();
    expect(screen.getByText("확정 예정")).toBeInTheDocument();
    expect(screen.getByText("2026-09-30 07:30")).toBeInTheDocument();
    expect(screen.getByText("2026-09-30 08:00")).toBeInTheDocument();
    expect(screen.getByText("2026-09-30 08:05")).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText("학원"), { target: { value: "2" } });
    expect(await screen.findByText("B학원 버스")).toBeInTheDocument();
    await act(async () => {
      resolveA({ runs: [{ ...baseRun, runId: "10", busNo: "A학원 버스" }] });
    });

    expect(screen.queryByText("A학원 버스")).not.toBeInTheDocument();
    expect(screen.getByText("B학원 버스")).toBeInTheDocument();
  });
});
