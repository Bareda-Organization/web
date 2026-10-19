import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RosterItemResponseTypes } from "../types";
import { RunRosterCard } from "./RunRosterCard";

const row = (patch: Partial<RosterItemResponseTypes>): RosterItemResponseTypes => ({
  studentId: "1",
  name: "학생",
  className: "기본반",
  stopName: "정문",
  stopId: "s1",
  stopSeq: 1,
  transferId: null,
  guardianPhone: null,
  change: null,
  status: "waiting",
  note: null,
  ...patch,
});

const routeStops = [
  { stopId: "s1", name: "정문" },
  { stopId: "s2", name: "후문" },
  { stopId: "s3", name: "공원" },
];
const roster = [row({ studentId: "1", stopId: "s1", stopName: "정문" }), row({ studentId: "2", name: "둘째", stopId: "s2", stopName: "후문" }), row({ studentId: "3", name: "셋째", stopId: "s3", stopName: "공원" })];

const renderCard = (over: { isIdle: boolean; currentStop: string | null; nextStop: string | null }) =>
  render(
    <RunRosterCard
      roster={roster}
      routeStops={routeStops}
      canTransfer={false}
      loading={false}
      statusFilter="all"
      onStatusFilterChange={vi.fn()}
      onTransfer={vi.fn()}
      onCancelTransfer={vi.fn()}
      {...over}
    />,
  );

// 명단은 승하차지(C-12) 단위로 묶는다 — 머리글과 현재 · 다음 표시도 「승하차지」 말로 말한다.
describe("RunRosterCard — 승하차지 묶음 글", () => {
  it("운행 중에는 머리글이 승하차지 순이고 현재 · 다음 승하차지 칩을 단다", () => {
    renderCard({ isIdle: false, currentStop: "후문", nextStop: "공원" });

    expect(screen.getByText("승하차지 순 · 위쪽이 이미 지난 승하차지")).toBeInTheDocument();
    expect(screen.getByText("현재 승하차지")).toBeInTheDocument();
    expect(screen.getByText("다음 승하차지")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("정차지");
  });

  it("확정 전 회차의 머리글은 「승하차지 순」 이다", () => {
    renderCard({ isIdle: true, currentStop: null, nextStop: null });

    expect(screen.getByText("승하차지 순")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("정차지");
  });
});
