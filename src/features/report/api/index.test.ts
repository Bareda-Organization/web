import { afterEach, describe, expect, it, vi } from "vitest";
import { getReports } from "./index";

// §5.20 EXC-02·03 — snake_case ↔ camelCase 변환 경계. 상세 조회(GET /staff/reports/{id})는
// 목록 항목과 필드가 같아 화면이 부르지 않으므로 웹 함수를 두지 않는다(R46-WEB A#16).
// studentName 이 null 인 경계값과 채워진 경우를 각각 검사한다.
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
        reportedByRole: null,
        handledByName: null,
      },
    ]);
  });

  it("guardian_absent 보고의 studentName 을 채워 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
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
            ],
          },
        }),
      ),
    );

    const [result] = (await getReports()).items;

    expect(result!.studentName).toBe("김바래");
    expect(result!.handled).toBe(true);
    expect(result!.handledAt).toBe("2026-09-15T17:45:00");
  });
});
