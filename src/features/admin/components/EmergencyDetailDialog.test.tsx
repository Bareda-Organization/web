import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmergencyDetailDialog } from "./EmergencyDetailDialog";

const EMERGENCY = {
  emergencyId: "1",
  academy: { id: "1", name: "바래다학원", contact: "02-000-0000" },
  type: "accident" as const,
  memo: null,
  raisedBy: { name: "이기사", role: "driver" as const, phone: "010-1111-2222" },
  runId: "1",
  busNo: "1호차",
  direction: "to_academy" as const,
  position: { lat: 37.5, lng: 127.0, recordedAt: null },
  riderCount: 1,
  contacts: [],
  raisedAt: "2026-09-30T08:00:00",
  staffAcked: true,
  ackedAt: "2026-09-30T08:05:00",
  canceledAt: null,
  ackedBy: { name: "김관계", memo: "119 신고 완료" } as { name: string; memo: string | null } | null,
  elapsedSinceRaised: 300,
};

// Ruling 541 — 학원 관계자가 확인할 때 남긴 조치 메모를 메인 관리자도 상세에서 본다.
describe("메인 관리자 EmergencyDetailDialog — 조치 메모", () => {
  it("확인자 이름과 조치 메모를 보여 준다", () => {
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} />);

    expect(screen.getByText("확인됨 (김관계)")).toBeInTheDocument();
    expect(screen.getByText("119 신고 완료")).toBeInTheDocument();
  });

  it("메모 없이 확인된 건은 조치 메모 칸에 '-' 를 보인다", () => {
    render(
      <EmergencyDetailDialog emergency={{ ...EMERGENCY, ackedBy: { name: "김관계", memo: null } }} onClose={vi.fn()} />,
    );

    expect(screen.getByText("조치 메모").nextSibling).toHaveTextContent("-");
  });
});

// R47 Ruling 744 — 단말이 누른 시각은 참고값이다. 접수 시각과 1분 넘게 벌어졌을 때만 목록과 같은 문구로 덧붙인다.
describe("메인 관리자 EmergencyDetailDialog — 단말 기록 시각", () => {
  const RAISED = "2026-09-12T08:10:00+09:00";

  it("접수 시각과 1분 넘게 벌어진 단말 시각을 접수 시각 아래에 병기한다", () => {
    render(
      <EmergencyDetailDialog
        emergency={{ ...EMERGENCY, raisedAt: RAISED, occurredAt: "2026-09-12T08:02:00+09:00" }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("단말 기록 08:02(참고)")).toBeInTheDocument();
  });

  it("단말 시각이 접수 시각과 비슷하거나 없으면 병기하지 않는다", () => {
    const { rerender } = render(
      <EmergencyDetailDialog
        emergency={{ ...EMERGENCY, raisedAt: RAISED, occurredAt: "2026-09-12T08:09:30+09:00" }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/단말 기록/)).not.toBeInTheDocument();

    rerender(<EmergencyDetailDialog emergency={{ ...EMERGENCY, raisedAt: RAISED, occurredAt: null }} onClose={vi.fn()} />);
    expect(screen.queryByText(/단말 기록/)).not.toBeInTheDocument();
  });
});
