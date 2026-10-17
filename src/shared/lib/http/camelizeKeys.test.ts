import { describe, expect, it } from "vitest";
import { camelizeKeys } from "./camelizeKeys";
import { apiFetch } from "./httpClient";
import { mockJsonResponse } from "@/shared/testing/httpResponse";
import { afterEach, vi } from "vitest";

describe("camelizeKeys", () => {
  it("최상위 키를 camelCase 로 바꾸고 값은 그대로 둔다", () => {
    expect(camelizeKeys({ bus_no: "1호차", total_count: 3, ok: true, note: null })).toEqual({ busNo: "1호차", totalCount: 3, ok: true, note: null });
  });

  it("중첩 객체 안의 키도 바꾼다", () => {
    expect(camelizeKeys({ raised_by: { phone_number: "010", home_address: { zip_code: "1" } } })).toEqual({
      raisedBy: { phoneNumber: "010", homeAddress: { zipCode: "1" } },
    });
  });

  // 배열 안 객체의 키를 못 바꾸면 목록 응답(items · runs · today_runs …)이 전부 snake_case 로 남는다.
  it("배열 안 객체와 배열 안 배열 안 객체의 키도 바꾼다", () => {
    expect(
      camelizeKeys({ items: [{ run_id: 1, riders: [{ student_id: 2 }] }], matrix: [[{ stop_seq: 3 }]] }),
    ).toEqual({ items: [{ runId: 1, riders: [{ studentId: 2 }] }], matrix: [[{ stopSeq: 3 }]] });
  });

  it("밑줄 뒤 숫자도 바꾸고, 밑줄이 없는 키(상태 · 요일을 키로 쓰는 맵)는 그대로 둔다", () => {
    expect(camelizeKeys({ phone_2: "x", by_status: { idle: 1, moving: 2 }, work_hours: { mon: [1], sun: [] } })).toEqual({
      phone2: "x",
      byStatus: { idle: 1, moving: 2 },
      workHours: { mon: [1], sun: [] },
    });
  });

  it("원시 값 · null · 빈 배열은 그대로 돌려준다", () => {
    expect(camelizeKeys(null)).toBeNull();
    expect(camelizeKeys("a_b")).toBe("a_b");
    expect(camelizeKeys([])).toEqual([]);
  });
});

describe("apiFetch — 성공 응답 봉투를 벗기며 키를 camelCase 로 바꾼다", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("목록 응답의 배열 안 객체 키까지 camelCase 로 온다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, { success: true, data: { items: [{ bus_no: "1호차", today_runs: [{ run_id: 7 }] }], total_count: 1 }, message: null }),
      ),
    );

    const data = await apiFetch<{ items: { busNo: string; todayRuns: { runId: number }[] }[]; totalCount: number }>("/staff/buses");

    expect(data).toEqual({ items: [{ busNo: "1호차", todayRuns: [{ runId: 7 }] }], totalCount: 1 });
  });
});
