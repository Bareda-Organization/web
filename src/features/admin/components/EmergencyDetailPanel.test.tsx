import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmergencyDetailPanel } from "./EmergencyDetailPanel";

vi.mock("@/features/map", () => ({ MapSurface: () => <div data-testid="map" /> }));

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
describe("메인 관리자 EmergencyDetailPanel — 조치 메모", () => {
  it("확인자 이름과 조치 메모를 보여 준다", () => {
    render(<EmergencyDetailPanel emergency={EMERGENCY} />);

    expect(screen.getByText(/김관계 · 발신 5분 뒤/)).toBeInTheDocument();
    expect(screen.getByText(/119 신고 완료/)).toBeInTheDocument();
  });

  it("메모 없이 확인된 건은 조치 메모를 지어내지 않는다", () => {
    render(<EmergencyDetailPanel emergency={{ ...EMERGENCY, ackedBy: { name: "김관계", memo: null } }} />);

    expect(screen.getByText(/김관계 · 발신 5분 뒤/)).toBeInTheDocument();
    expect(screen.queryByText(/조치 메모/)).not.toBeInTheDocument();
  });

  // R48 시안 `emergency-alerts` — 오른쪽 상시 칸의 [바로 연락]: 발신자 · 동승자 · 학원 대표에 전화 단추(tel:).
  it("바로 연락에 발신자와 연락처 목록, 학원 대표 번호를 전화 링크로 둔다", () => {
    render(
      <EmergencyDetailPanel
        emergency={{ ...EMERGENCY, contacts: [{ name: "윤미경", role: "escort", phone: "010-0000-2013" }] }}
      />,
    );

    expect(screen.getByRole("link", { name: "이기사 전화" })).toHaveAttribute("href", "tel:010-1111-2222");
    expect(screen.getByRole("link", { name: "윤미경 전화" })).toHaveAttribute("href", "tel:010-0000-2013");
    expect(screen.getByRole("link", { name: "학원 대표 전화" })).toHaveAttribute("href", "tel:02-000-0000");
  });

  // 확인이 없는 비상은 응답 소요가 아니라 "몇 분째 응답 없음" 이다.
  it("미확인 비상은 학원 확인 칸에 몇 분째 응답하지 않는지를 보인다", () => {
    render(<EmergencyDetailPanel emergency={{ ...EMERGENCY, staffAcked: false, ackedAt: null, ackedBy: null, elapsedSinceRaised: 840 }} />);

    expect(screen.getByText("미확인 · 14분째")).toBeInTheDocument();
    expect(screen.getByText("학원 관계자가 아직 응답하지 않음")).toBeInTheDocument();
  });

  it("접수 1분이 안 된 미확인 비상은 '미확인 · 1분 미만' 으로 적는다('째' 를 붙이지 않는다)", () => {
    render(<EmergencyDetailPanel emergency={{ ...EMERGENCY, staffAcked: false, ackedAt: null, ackedBy: null, elapsedSinceRaised: 30 }} />);

    expect(screen.getByText("미확인 · 1분 미만")).toBeInTheDocument();
  });

  // R50 M7 — 사양 용어는 동승자(`escort`)다. '동승 매니저' 와 섞어 쓰지 않는다.
  it("연락처의 동승자는 사양 용어 '동승자' 로 적는다", () => {
    render(<EmergencyDetailPanel emergency={{ ...EMERGENCY, contacts: [{ name: "윤미경", role: "escort", phone: "010-0000-2013" }] }} />);

    expect(screen.getByText(/동승자/)).toBeInTheDocument();
    expect(screen.queryByText(/동승 매니저/)).not.toBeInTheDocument();
  });
});

// R47 Ruling 744 — 단말이 누른 시각은 참고값이다. 접수 시각과 1분 넘게 벌어졌을 때만 목록과 같은 문구로 덧붙인다.
describe("메인 관리자 EmergencyDetailPanel — 단말 기록 시각", () => {
  const RAISED = "2026-09-12T08:10:00+09:00";

  it("접수 시각과 1분 넘게 벌어진 단말 시각을 접수 시각 아래에 병기한다", () => {
    render(
      <EmergencyDetailPanel
        emergency={{ ...EMERGENCY, raisedAt: RAISED, occurredAt: "2026-09-12T08:02:00+09:00" }}
       
      />,
    );

    expect(screen.getByText("단말 기록 08:02(참고)")).toBeInTheDocument();
  });

  it("단말 시각이 접수 시각과 비슷하거나 없으면 병기하지 않는다", () => {
    const { rerender } = render(
      <EmergencyDetailPanel
        emergency={{ ...EMERGENCY, raisedAt: RAISED, occurredAt: "2026-09-12T08:09:30+09:00" }}
       
      />,
    );
    expect(screen.queryByText(/단말 기록/)).not.toBeInTheDocument();

    rerender(<EmergencyDetailPanel emergency={{ ...EMERGENCY, raisedAt: RAISED, occurredAt: null }} />);
    expect(screen.queryByText(/단말 기록/)).not.toBeInTheDocument();
  });
});

// R52 M10 · API_SPEC §6.11 — 학원이 대표 연락처를 등록하지 않으면 `contact` 는 키는 있고 값이 null 이다. `tel:null` 링크를 만들지 않는다.
describe("메인 관리자 EmergencyDetailPanel — 학원 연락처 미등록", () => {
  it("contact 가 null 이면 '연락처 미등록' 을 적고 학원 대표 전화 링크를 두지 않는다", () => {
    render(<EmergencyDetailPanel emergency={{ ...EMERGENCY, academy: { ...EMERGENCY.academy, contact: null } }} />);

    expect(screen.getByText("연락처 미등록")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "학원 대표 전화" })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="tel:null"]')).toBeNull();
  });

  it("contact 가 있으면 번호와 전화 링크가 그대로 있다", () => {
    render(<EmergencyDetailPanel emergency={EMERGENCY} />);

    expect(screen.getByRole("link", { name: "학원 대표 전화" })).toHaveAttribute("href", "tel:02-000-0000");
    expect(screen.queryByText("연락처 미등록")).not.toBeInTheDocument();
  });
});
