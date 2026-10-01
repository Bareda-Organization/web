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
  ackedBy: null,
};

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
