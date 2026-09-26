import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForceConfirmPage } from "./ForceConfirmPage";
import { getAcademies, getAcademyRunsLive } from "../api";
import type { RunLiveItemResponseTypes } from "../types";

// W4 — 확정이 계속 실패하는 회차를 강제 확정 대상 목록에서 바로 알아본다
// (`API_SPEC §6.8` `consecutive_failures`, BR-047 · `UF-O-07`). 0(성공)이면
// 표시하지 않는다 — `RunDayList.test.tsx` 와 같은 판단.
vi.mock("../api", () => ({
  getAcademies: vi.fn(),
  getAcademyRunsLive: vi.fn(),
}));

const mockGetAcademies = vi.mocked(getAcademies);
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
    mockGetAcademies.mockResolvedValue({
      items: [{ id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" }],
      page: 1,
      size: 20,
      totalCount: 1,
      hasNext: false,
    });
    mockGetRunsLive.mockResolvedValue({ runs: [{ ...baseRun, consecutiveFailures: 4 }] });

    render(<ForceConfirmPage />);

    expect(await screen.findByText("확정 4회 연속 실패")).toBeInTheDocument();
  });

  it("consecutiveFailures 가 0 이면 문구를 보여주지 않는다", async () => {
    mockGetAcademies.mockResolvedValue({
      items: [{ id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" }],
      page: 1,
      size: 20,
      totalCount: 1,
      hasNext: false,
    });
    mockGetRunsLive.mockResolvedValue({ runs: [baseRun] });

    render(<ForceConfirmPage />);

    await screen.findByText("701호");
    expect(screen.queryByText(/연속 실패/)).not.toBeInTheDocument();
  });
});
