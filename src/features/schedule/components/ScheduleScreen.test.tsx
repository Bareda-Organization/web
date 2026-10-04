import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRuns, getSchedules } from "../api";
import { ScheduleScreen } from "./ScheduleScreen";

vi.mock("../api", () => ({ getSchedules: vi.fn(), getRuns: vi.fn(), cancelRun: vi.fn() }));
vi.mock("@/features/bus", () => ({ getBuses: vi.fn().mockResolvedValue({ items: [], page: 0, size: 100, totalCount: 0, hasNext: false }) }));
vi.mock("./ScheduleForm", () => ({ ScheduleForm: () => null }));

const emptyPage = { items: [], page: 0, size: 20, totalCount: 0, hasNext: false };

// /schedule 은 화면 제목(운행 스케줄 · 일일 회차)이 이미 있다 — 정규 스케줄 탭이 "운행 스케줄" 제목을 한 번 더 그리면 제목이 둘이다.
describe("ScheduleScreen — 화면 제목", () => {
  beforeEach(() => {
    vi.mocked(getSchedules).mockResolvedValue(emptyPage);
    vi.mocked(getRuns).mockResolvedValue({ items: [] });
  });

  it("정규 스케줄 탭도 제목은 하나이고, 건수와 [스케줄 등록] 은 그대로 있다", async () => {
    render(<ScheduleScreen />);
    await screen.findByText("등록된 스케줄이 없습니다");

    expect(screen.getAllByRole("heading", { name: /운행 스케줄/ })).toHaveLength(1);
    // 건수는 지표 칸이 말한다(시안: 정규 스케줄 N건).
    expect(screen.getByText("정규 스케줄", { selector: "div" }).parentElement).toHaveTextContent("0건");
    expect(screen.getAllByRole("button", { name: "스케줄 등록" }).length).toBeGreaterThan(0);
  });

  it("일일 회차 탭으로 바꿔도 제목은 하나다", async () => {
    render(<ScheduleScreen />);
    await screen.findByText("등록된 스케줄이 없습니다");

    fireEvent.click(screen.getByRole("tab", { name: /일일 회차/ }));

    expect(screen.getAllByRole("heading", { name: /운행 스케줄/ })).toHaveLength(1);
  });
});
