import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmergencyDetailDialog } from "./EmergencyDetailDialog";

const EMERGENCY = {
  emergencyId: "1",
  type: "accident" as const,
  memo: null,
  raisedBy: { name: "이기사", role: "driver" as const, phone: "010-1111-2222" },
  runId: "10",
  busNo: "1호차",
  direction: "to_academy" as const,
  position: { lat: 37.5, lng: 127.0, recordedAt: null },
  riderCount: 5,
  contacts: [
    { name: "박동승", role: "escort" as const, phone: "010-3333-4444" },
    { name: "번호없음", role: "driver" as const, phone: null },
  ],
  raisedAt: "2026-09-12T08:00:00",
  ackedAt: null,
  canceledAt: null,
  acked: false,
  ackedBy: null as { name: string; memo: string | null } | null,
};

// Ruling 541 — 확인할 때 조치 메모를 남기고(선택), 확인된 건은 확인자와 메모를 보여 준다.
describe("EmergencyDetailDialog — 조치 메모", () => {
  // R46-LAST Ruling 583 — 이 칸은 퇴원 파기 대상 밖이라 입력 단계에서 개인정보를 줄인다.
  it("조치 메모 칸 아래에 학생 이름·연락처를 적지 말라고 안내한다", () => {
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} onAck={vi.fn()} />);

    expect(screen.getByText(/학생 이름·연락처는 적지 마세요/)).toBeInTheDocument();
  });

  it("미확인 건은 메모 입력칸과 [확인] 버튼이 있고, 입력한 메모로 확인을 요청한다", () => {
    const onAck = vi.fn();
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} onAck={onAck} />);

    fireEvent.change(screen.getByLabelText(/조치 메모/), { target: { value: "119 신고 완료" } });
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(onAck).toHaveBeenCalledWith("119 신고 완료");
  });

  it("메모를 비워 두고 확인하면 메모 없이 요청한다", () => {
    const onAck = vi.fn();
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} onAck={onAck} />);

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(onAck).toHaveBeenCalledWith(undefined);
  });

  it("메모 입력칸은 200자까지만 받는다 — 서버 상한과 같다", () => {
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} onAck={vi.fn()} />);

    expect(screen.getByLabelText(/조치 메모/)).toHaveAttribute("maxlength", "200");
  });

  it("확인된 건은 입력칸 대신 확인자와 조치 메모를 보여 준다", () => {
    const acked = { ...EMERGENCY, acked: true, ackedAt: "2026-09-12T08:05:00", ackedBy: { name: "김관계", memo: "119 신고 완료" } };
    render(<EmergencyDetailDialog emergency={acked} onClose={vi.fn()} onAck={vi.fn()} />);

    expect(screen.queryByLabelText(/조치 메모/)).not.toBeInTheDocument();
    expect(screen.getByText("김관계")).toBeInTheDocument();
    expect(screen.getByText("119 신고 완료")).toBeInTheDocument();
  });
});

// B1 #17 — 비상 때 가장 급한 일은 기사·동승자에게 전화하는 것이다. 번호가 글자로만 있으면 옮겨 적어야 한다.
describe("EmergencyDetailDialog — 연락처", () => {
  afterEach(() => vi.restoreAllMocks());

  it("발신자·배치 인력 번호는 tel: 링크이고 하이픈은 뺀다", () => {
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} />);

    expect(screen.getByRole("link", { name: "010-1111-2222" })).toHaveAttribute("href", "tel:01011112222");
    expect(screen.getByRole("link", { name: "010-3333-4444" })).toHaveAttribute("href", "tel:01033334444");
  });

  it("번호가 없는 사람은 링크 없이 '번호 없음' 으로 보인다", () => {
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} />);

    expect(screen.getByText("번호 없음")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^010/ })).toHaveLength(2);
  });

  it("복사 버튼을 누르면 그 번호를 클립보드에 넣고 '복사됨' 으로 바뀐다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "복사" })[0]);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("010-1111-2222"));
    expect(await screen.findByRole("button", { name: "복사됨" })).toBeInTheDocument();
  });
});

// R47 Ruling 744 — 단말이 누른 시각은 참고값이다. 접수(발생) 시각과 1분 넘게 벌어졌을 때만 목록과 같은 문구로 덧붙인다.
describe("EmergencyDetailDialog — 단말 기록 시각", () => {
  const RAISED = "2026-09-12T08:10:00+09:00";

  it("발생 시각과 1분 넘게 벌어진 단말 시각을 병기한다", () => {
    render(
      <EmergencyDetailDialog
        emergency={{ ...EMERGENCY, raisedAt: RAISED, occurredAt: "2026-09-12T08:02:00+09:00" }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("단말 기록 08:02(참고)")).toBeInTheDocument();
  });

  it("단말 시각이 발생 시각과 비슷하거나 없으면 병기하지 않는다", () => {
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

// Ruling 848 ③ — 위치 기록이 없는 비상 건은 지도 링크 없이 "위치 확인 불가" 로 그린다(지금은 `…/search/null,null` 로 열린다).
describe("EmergencyDetailDialog — 발신 위치가 없는 건", () => {
  it("위치가 null 이면 '위치 확인 불가' 를 보이고 지도 링크를 두지 않는다", () => {
    render(
      <EmergencyDetailDialog
        emergency={{ ...EMERGENCY, position: { lat: null, lng: null, recordedAt: null } }}
        onClose={vi.fn()}
        onAck={vi.fn()}
      />,
    );

    expect(screen.getByText("위치 확인 불가")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "지도에서 보기" })).not.toBeInTheDocument();
  });

  it("위치가 있으면 좌표를 실은 지도 링크를 보인다", () => {
    render(<EmergencyDetailDialog emergency={EMERGENCY} onClose={vi.fn()} onAck={vi.fn()} />);

    expect(screen.getByRole("link", { name: "지도에서 보기" })).toHaveAttribute("href", "https://map.naver.com/p/search/37.5,127");
    expect(screen.queryByText("위치 확인 불가")).not.toBeInTheDocument();
  });
});
