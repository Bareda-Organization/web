import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { AcademiesPage } from "./admin/components/AcademiesPage";
import { BlockedAccountsPage } from "./admin/components/BlockedAccountsPage";
import { MemberAccountsPage } from "./admin/components/MemberAccountsPage";
import { MemberApprovalsPage } from "./admin/components/MemberApprovalsPage";
import { StaleMovingRunsPage } from "./admin/components/StaleMovingRunsPage";
import { ChangeApprovalList } from "./approval/components/ChangeApprovalList";
import { SignupApprovalPage } from "./approval/components/SignupApprovalPage";
import { BusList } from "./bus/components/BusList";
import { EmergencyList } from "./emergency/components/EmergencyList";
import { ManagerList } from "./manager/components/ManagerList";
import { NotificationList } from "./notification/components/NotificationList";
import { ReportList } from "./report/components/ReportList";
import { RouteList } from "./route/components/RouteList";
import { ScheduleList } from "./schedule/components/ScheduleList";
import { StudentList } from "./student/components/StudentList";

// 조회가 실패한 목록의 머리줄이 "총 0대" 처럼 실제로는 모르는 건수를 0 으로 보이면 안 된다.
// 목록 화면이 api 모듈의 모든 함수를 실패시켜, 머리줄이 같은 구조인 14곳을 한 번에 본다.
const { failingApi } = vi.hoisted(() => ({
  failingApi: async (importOriginal: () => Promise<Record<string, unknown>>) => {
    const original = await importOriginal();
    const entries = Object.entries(original).map(([name, value]) => [
      name,
      typeof value === "function" ? vi.fn().mockRejectedValue(new Error("서버 오류")) : value,
    ]);
    return Object.fromEntries(entries);
  },
}));

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter, useSearchParams: () => new URLSearchParams() }));
vi.mock("./admin/api", failingApi);
vi.mock("./approval/api", failingApi);
vi.mock("./bus/api", failingApi);
vi.mock("./emergency/api", failingApi);
vi.mock("./manager/api", failingApi);
vi.mock("./notification/api", failingApi);
vi.mock("./report/api", failingApi);
vi.mock("./route/api", failingApi);
vi.mock("./schedule/api", failingApi);
vi.mock("./student/api", failingApi);

// [이름, 화면, 조회 전에 머리줄이 보여 주던 문구]
const lists: [string, () => ReactElement, string | RegExp][] = [
  ["차량", () => <BusList />, "총 0대"],
  ["운행 스케줄", () => <ScheduleList />, "총 0건"],
  ["노선 편성", () => <RouteList />, "총 0건"],
  ["알림 로그", () => <NotificationList />, "총 0건 · 수신자 미확인 0건"],
  ["학생", () => <StudentList />, "총 0명"],
  ["관계자", () => <ManagerList />, "총 0명"],
  ["운행 리포트", () => <ReportList />, "총 0건"],
  ["비상 알림 수신", () => <EmergencyList />, "미확인 0건"],
  ["가입 승인", () => <SignupApprovalPage />, "처리 대기 0건"],
  ["구간 변경 승인", () => <ChangeApprovalList />, "처리 대기 0건"],
  ["학원(메인 관리자)", () => <AcademiesPage />, /0개 학원|학원 0곳/],
  ["관계자 가입 승인(메인 관리자)", () => <MemberApprovalsPage />, /처리 대기 0건|가입 요청 0건/],
  ["관계자 계정(메인 관리자)", () => <MemberAccountsPage />, /0개 계정/],
  ["차단 계정(메인 관리자)", () => <BlockedAccountsPage />, /차단된 계정 0건/],
  ["끝나지 않은 회차(메인 관리자)", () => <StaleMovingRunsPage />, /끝나지 않은 회차 0건/],
];

describe("목록 조회 실패 — 머리줄에 건수를 보이지 않는다", () => {
  it.each(lists)("%s", async (_name, renderList, headerCount) => {
    render(renderList());

    // 오류 상태에 들어가면 표가 [다시 시도] 를 그린다 — 이 버튼이 "조회가 실패했다" 의 확인이다.
    await screen.findByRole("button", { name: "다시 시도" });

    expect(screen.queryByText(headerCount)).not.toBeInTheDocument();
  });
});
