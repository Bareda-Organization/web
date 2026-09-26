import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmergencyList } from "./EmergencyList";
import { ackEmergency, getEmergencies } from "../api";

// §5.16 EXC-04 · API_SPEC §1.9 — 확인(ack) 처리가 서버에서 거부되면 화면이
// 조용히 넘어가지 않고 오류 문구를 보여줘야 한다(목록을 다시 불러오지 않고
// 그대로 "확인" 버튼이 남아 있어야 한다는 뜻이기도 하다).
vi.mock("../api", () => ({
  getEmergencies: vi.fn(),
  ackEmergency: vi.fn(),
}));

const mockGet = vi.mocked(getEmergencies);
const mockAck = vi.mocked(ackEmergency);

const ITEM = {
  emergencyId: "1",
  type: "accident" as const,
  memo: null,
  raisedBy: { name: "이기사", role: "driver" as const, phone: "010-1111-2222" },
  runId: "10",
  busNo: "1호차",
  direction: "to_academy" as const,
  position: { lat: 37.5, lng: 127.0, recordedAt: null },
  riderCount: 5,
  contacts: [],
  raisedAt: "2026-09-12T08:00:00",
  ackedAt: null,
  canceledAt: null,
  acked: false,
  ackedBy: null,
};

describe("EmergencyList — 확인(ack) 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("확인 처리가 거부되면 목록을 다시 불러오지 않고 오류 문구를 보여준다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    mockAck.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));

    render(<EmergencyList />);

    await waitFor(() => expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => expect(screen.getByText("확인 처리에 실패했습니다")).toBeInTheDocument());
    // 재조회(load)가 일어나지 않았어야 한다 — 최초 1회만 호출된 채로 남는다.
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
