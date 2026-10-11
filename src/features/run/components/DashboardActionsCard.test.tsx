import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardActionsCard } from "./DashboardActionsCard";
import type { DashboardRunResponseTypes } from "../types";

const NOW = Date.parse("2026-10-01T08:00:00Z");

const runWithNoShow = (expiresAt: string) =>
  ({
    runId: "1",
    busNo: "1호차",
    direction: "to_academy",
    runStatus: "moving",
    departTime: "2026-10-01T08:10:00Z",
    driverName: "기사",
    escortName: "동승자",
    ackDriver: true,
    ackEscort: true,
    noShowCases: [{ studentName: "이학생", stopName: "정문", expiresAt, callAttempts: 0, lastContactResult: null }],
  }) as unknown as DashboardRunResponseTypes;

const approvals = { signupCount: 0, changeCount: 0, nextDeadlineAt: null, isReady: true };

// R53 t5 A8 — 카운트다운이 끝난 뒤에도 '1분 안' 으로 보였다(Math.max(1, …)). 운행 상세 띠(TodayRunAlerts)처럼 끝났다고 알린다.
describe("DashboardActionsCard — 미승차 만료 문구(R53 A8)", () => {
  it("만료 전에는 남은 분을 '분 안' 으로 보인다", () => {
    render(<DashboardActionsCard runs={[runWithNoShow("2026-10-01T08:03:00Z")]} unassignedManagers={0} approvals={approvals} nowMs={NOW} />);

    expect(screen.getByText("3분 안")).toBeInTheDocument();
  });

  it("만료 시각이 지났으면 '1분 안' 이 아니라 카운트다운이 끝났다고 보인다", () => {
    render(<DashboardActionsCard runs={[runWithNoShow("2026-10-01T07:58:00Z")]} unassignedManagers={0} approvals={approvals} nowMs={NOW} />);

    expect(screen.queryByText("1분 안")).not.toBeInTheDocument();
    expect(screen.getByText("카운트다운 끝남")).toBeInTheDocument();
  });

  it("만료 뒤 설명줄은 '보호자 연락 중' 이 아니라 관계자 판단으로 출발한다고 알린다", () => {
    render(<DashboardActionsCard runs={[runWithNoShow("2026-10-01T07:58:00Z")]} unassignedManagers={0} approvals={approvals} nowMs={NOW} />);

    expect(screen.queryByText(/보호자 연락 중/)).not.toBeInTheDocument();
    expect(screen.getByText(/관계자 판단으로 출발/)).toBeInTheDocument();
  });

  it("만료 전 설명줄에는 보호자 연락 중이 남는다", () => {
    render(<DashboardActionsCard runs={[runWithNoShow("2026-10-01T08:03:00Z")]} unassignedManagers={0} approvals={approvals} nowMs={NOW} />);

    expect(screen.getByText(/보호자 연락 중/)).toBeInTheDocument();
  });

  // 남은 시간 포맷은 useNow 의 공용 함수 한 벌 — 한 시간 넘으면 "1시간 30분" 으로 읽힌다(로컬 사본은 "90분").
  it("구간 변경 승인 기한이 한 시간 넘게 남으면 '1시간 30분 남음' 으로 보인다", () => {
    render(
      <DashboardActionsCard
        runs={[]}
        unassignedManagers={0}
        approvals={{ signupCount: 0, changeCount: 1, nextDeadlineAt: "2026-10-01T09:30:00Z", isReady: true }}
        nowMs={NOW}
      />,
    );

    expect(screen.getByText(/가장 이른 건 1시간 30분 남음/)).toBeInTheDocument();
  });
});
