import { render, screen } from "@testing-library/react";
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
