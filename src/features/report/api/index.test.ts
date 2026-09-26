import { afterEach, describe, expect, it, vi } from "vitest";
import { getReportDetail, getReports } from "./index";

// §5.20 EXC-02·03 — snake_case ↔ camelCase 변환 경계. getReports 와
// getReportDetail 은 같은 toItem 함수를 공유한다(목록·상세 필드 구성이 실측상
// 동일해 별도 상세 변환을 두지 않았다 — api/index.ts §1 판단 근거) — 그래서
// 다른 기능처럼 "두 함수를 대조" 하는 기법은 적용 대상이 아니다(§2 확신 없는
// 지점). 대신 studentName 이 null 인 경계값과 채워진 경우를 각각 검사한다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("report api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getReports 는 studentName 이 null 인 항목도 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
                report_id: 1,
                type: "vehicle_issue",
                memo: "브레이크 소음",
                run_id: 7,
                bus_no: "1호차",
                student_name: null,
                reported_by: "이기사",
                reported_at: "2026-09-15T08:00:00",
                handled: false,
                handled_at: null,
              },
            ],
          },
        }),
      ),
    );

    const result = await getReports();

    expect(result.items).toEqual([
      {
        reportId: "1",
        type: "vehicle_issue",
        memo: "브레이크 소음",
        runId: "7",
        busNo: "1호차",
        studentName: null,
        reportedBy: "이기사",
        reportedAt: "2026-09-15T08:00:00",
        handled: false,
        handledAt: null,
      },
    ]);
  });

  it("getReportDetail 은 guardian_absent 보고의 studentName 을 채워 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            report_id: 2,
            type: "guardian_absent",
            memo: "보호자 부재",
            run_id: 7,
            bus_no: "1호차",
            student_name: "김바래",
            reported_by: "박동승",
            reported_at: "2026-09-15T17:30:00",
            handled: true,
            handled_at: "2026-09-15T17:45:00",
          },
        }),
      ),
    );

    const result = await getReportDetail("2");

    expect(result.studentName).toBe("김바래");
    expect(result.handled).toBe(true);
    expect(result.handledAt).toBe("2026-09-15T17:45:00");
  });
});
