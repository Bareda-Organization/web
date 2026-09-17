// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { cancelRun, createRun, createSchedule, deleteSchedule, getRuns, getSchedules, updateSchedule } from "./index";
import type { ScheduleWeekday } from "../types";

// 운행 스케줄·일일 회차 화면(§5.10, SCH-01~03, A-09)이 부르는 엔드포인트를
// 실제 F5-W1 전용 백엔드에 붙여 확인한다.
const API_BASE_URL = requireRealBackendApiBaseUrl();

let backendReachable = false;

beforeAll(async () => {
  try {
    await fetch(`${API_BASE_URL}/academies/search?q=바래다`);
    backendReachable = true;
  } catch {
    backendReachable = false;
  }
}, 10_000);

describe("schedule api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 소속 정규 스케줄 4개(월요일).

  it("getSchedules 는 staffA 학원의 정규 스케줄 목록을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getSchedules(0);

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("getRuns 는 §1.8 페이징이 아니라 맨 배열로 온다(api/index.ts 의 { items } 감싸기 확인)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getRuns();

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  // 임시 추가→취소를 한 시험 안에서 마친다. 취소는 행을 지우지 않고 canceled_at 만
  // 채우므로(2026-09-14 curl 로 먼저 확인) 시드를 해치지 않는다. service_date 를
  // 먼 미래로 둬 다른 시험·화면의 오늘 회차 조회와 겹치지 않게 한다.
  // depart_time 은 (bus_id, service_date, direction, depart_time) 조합이 취소된
  // 행과 겹쳐도 DUPLICATE 로 거부됨을 실행 중 발견해(고정값 "08:00" 이 이전 회차의
  // curl 검증 잔재와 충돌) 실행마다 달라지는 시각을 써서 재실행 시 충돌을 피한다.
  it("createRun 으로 만든 임시 회차를 cancelRun 으로 취소하면 canceled_at 이 채워진다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const minuteOfDay = Math.floor(Date.now() / 1000) % (24 * 60);
    const departTime = `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(
      minuteOfDay % 60,
    ).padStart(2, "0")}`;

    const created = await createRun({
      busId: 1,
      serviceDate: "2099-01-01",
      direction: "to_academy",
      departTime,
      originName: "실서버계약시험출발",
      destinationName: "실서버계약시험도착",
    });
    try {
      expect(created.scheduleId).toBeNull();
      expect(created.status).toBe("idle");
    } finally {
      await cancelRun(created.id);
    }

    const afterCancel = await getRuns("2099-01-01");
    const canceled = afterCancel.items.find((r) => r.id === created.id);
    expect(canceled?.canceledAt).not.toBeNull();
  });

  // r11-t1 — createSchedule→updateSchedule→deleteSchedule(§5.10, SCH-01) 왕복.
  // 시드는 "오늘 요일" 로만 스케줄을 채우므로(V2__seed_data.sql — extract(dow from now())),
  // weekday 를 내일 요일로 잡으면 (bus_id, weekday, direction) 조합이 시드와 절대 겹치지
  // 않는다 — 위 createRun/cancelRun 과 같은 자기완결형 왕복(자기가 만든 행을 자기가
  // 끝에서 지운다)이라 4번 연속 실행해도 DUPLICATE_SCHEDULE 이 나지 않는다.
  it("createSchedule 으로 만든 스케줄을 updateSchedule 로 고치고 deleteSchedule 로 지운다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const WEEKDAYS_BY_GETDAY: ScheduleWeekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const tomorrow = WEEKDAYS_BY_GETDAY[(new Date().getDay() + 1) % 7];

    const created = await createSchedule({
      busId: 1,
      weekday: tomorrow,
      direction: "to_academy",
      departTime: "07:30",
      originName: "실서버계약시험집결지",
      destinationName: "바래다학원 A",
    });
    try {
      expect(created.busId).toBe(1);
      expect(created.weekday).toBe(tomorrow);
      expect(created.active).toBe(true);

      const updated = await updateSchedule(created.id, { departTime: "07:45", active: false });
      expect(updated.departTime).toMatch(/^07:45/);
      expect(updated.active).toBe(false);
    } finally {
      await deleteSchedule(created.id);
    }

    const after = await getSchedules(0, 100);
    expect(after.items.some((item) => item.id === created.id)).toBe(false);
  });
});
