import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RunStrip } from "./RunStrip";
import type { DashboardRunResponseTypes } from "../types";

// Ruling 879 — 회차 행의 boarded_count 는 지금 타고 있는 학생이 아니라 탑승 완료 누계(boarded + alighted)다.
// 끝난 등원 회차는 전원이 내렸어도 '탑승 완료 N/N' 이어야 한다(현재 탑승 수로 읽히면 안 된다).
const finishedRun = {
  runId: "1",
  busNo: "1호차",
  direction: "to_academy",
  departTime: "2026-10-01T08:00:00Z",
  runStatus: "finished",
  driverName: "기사",
  escortName: "동승자",
  ackDriver: true,
  ackEscort: true,
  boardedCount: 12,
  totalCount: 12,
  noShowCases: [],
} as unknown as DashboardRunResponseTypes;

describe("RunStrip — 탑승 완료 기준 문구(Ruling 879)", () => {
  it("회차 카드의 건수는 '탑승 완료 N/M' 으로 읽힌다", () => {
    render(<RunStrip runs={[finishedRun]} selectedRunId="1" nowMs={Date.parse("2026-10-01T09:00:00Z")} onSelect={vi.fn()} />);

    expect(screen.getByText("탑승 완료 12/12")).toBeInTheDocument();
    expect(screen.queryByText("탑승 12/12")).not.toBeInTheDocument();
  });
});
