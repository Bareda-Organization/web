import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForceConfirmDialog } from "./ForceConfirmDialog";
import { forceConfirmRun } from "../api";
import { ApiError } from "@/shared/lib/http";
import type { RunLiveItemResponseTypes } from "../types";

// §6.14, BRIEF-a1.md §4.1 — "되돌릴 수 없다. 확인 단계와 그 결과 표시가 이 화면의 본체".
// 그래서 이 검사는 렌더 여부가 아니라 (1) 사유 없이는 실행할 수 없는지 (2) 성공한 뒤
// 폼으로 되돌아갈 길이 실제로 없는지를 확인한다.
vi.mock("../api", () => ({
  forceConfirmRun: vi.fn(),
}));

const mockForceConfirmRun = vi.mocked(forceConfirmRun);

const run: RunLiveItemResponseTypes = {
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
  driver: { name: "김기사", phone: "010-0000-0000" },
  escort: { name: "박동승", phone: "010-1111-1111" },
  consecutiveFailures: 0,
};

describe("ForceConfirmDialog — 되돌릴 수 없는 동작의 확인·결과 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("사유를 입력하지 않으면 강제 확정 버튼이 비활성 상태다", () => {
    render(<ForceConfirmDialog run={run} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByRole("button", { name: "강제 확정 실행" })).toBeDisabled();
  });

  it("성공하면 결과 화면으로 전환되고, 사유 입력창(폼)으로 돌아갈 길이 없다", async () => {
    mockForceConfirmRun.mockResolvedValue({
      runId: "42",
      routeVersionId: "9",
      fallbackUsed: true,
      confirmedAt: "2026-09-12T08:00:00Z",
    });
    render(<ForceConfirmDialog run={run} onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("강제 확정 사유"), {
      target: { value: "노선 계산 3회 연속 실패" },
    });
    fireEvent.click(screen.getByRole("button", { name: "강제 확정 실행" }));

    await waitFor(() => expect(screen.getByText("강제 확정 완료")).toBeInTheDocument());

    expect(mockForceConfirmRun).toHaveBeenCalledWith("42", "노선 계산 3회 연속 실패");
    // 결과 화면에는 폼 요소(사유 입력창·실행 버튼)가 존재하지 않고 "닫기"만 있다.
    expect(screen.queryByLabelText("강제 확정 사유")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "강제 확정 실행" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("RUN_NOT_IDLE 오류는 새로고침 안내 문구로 보여준다", async () => {
    mockForceConfirmRun.mockRejectedValue(new ApiError(409, "RUN_NOT_IDLE", "conflict"));
    render(<ForceConfirmDialog run={run} onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("강제 확정 사유"), { target: { value: "사유" } });
    fireEvent.click(screen.getByRole("button", { name: "강제 확정 실행" }));

    await waitFor(() =>
      expect(screen.getByText("이미 확정되었거나 대기 상태가 아닌 회차입니다 — 새로고침 후 다시 확인하세요.")).toBeInTheDocument(),
    );
  });

  // A1 수정 라운드(조건 ③) — RUN_NOT_IDLE 과 달리 RUN_NOT_DUE 는 단위 검사가 하나도 없었다.
  // 실제 백엔드(2026-09-12, schoolbus_a1 run id=1, confirm_at 이 아직 도래하지 않은 idle 회차)에
  // curl 로 재현해 응답 형태(409 · code=RUN_NOT_DUE · message="아직 확정 시각이 되지 않았습니다")를
  // 먼저 확인한 뒤 그 갈래에 맞춰 만들었다.
  it("RUN_NOT_DUE 오류는 확정 시각 전이라는 문구로 보여준다", async () => {
    mockForceConfirmRun.mockRejectedValue(new ApiError(409, "RUN_NOT_DUE", "아직 확정 시각이 되지 않았습니다"));
    render(<ForceConfirmDialog run={run} onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("강제 확정 사유"), { target: { value: "사유" } });
    fireEvent.click(screen.getByRole("button", { name: "강제 확정 실행" }));

    await waitFor(() =>
      expect(screen.getByText("아직 확정 예정 시각 전이라 강제 확정할 수 없습니다.")).toBeInTheDocument(),
    );
    // RUN_NOT_IDLE 문구와 다른 문구인지도 함께 본다 — 갈래가 실제로 갈렸는지 확인.
    expect(
      screen.queryByText("이미 확정되었거나 대기 상태가 아닌 회차입니다 — 새로고침 후 다시 확인하세요."),
    ).not.toBeInTheDocument();
  });
});
