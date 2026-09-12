import { afterEach, describe, expect, it, vi } from "vitest";
import { getStudentDetail, getStudents } from "./index";

// §5.11 STU-01 — snake_case ↔ camelCase 변환 경계. student_id 는 문자열 PK 라
// 다른 관리 화면(숫자 id)과 타입이 다르다는 점을 이 테스트가 함께 고정한다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("student api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getStudents 는 목록 항목 필드를 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
                student_id: "stu-1",
                name: "김바래",
                class_name: "초등부",
                bus_no: "1호차",
                stop_name: "정문",
                guardian_phone: "010-1111-2222",
              },
            ],
            page: 0,
            size: 20,
            total_count: 1,
            has_next: false,
          },
        }),
      ),
    );

    const result = await getStudents(0, 20);

    expect(result.items).toEqual([
      {
        studentId: "stu-1",
        name: "김바래",
        className: "초등부",
        busNo: "1호차",
        stopName: "정문",
        guardianPhone: "010-1111-2222",
      },
    ]);
  });

  it("getStudentDetail 은 canGoAlone·seatNo 등 상세 전용 필드까지 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            student_id: "stu-1",
            name: "김바래",
            student_phone: null,
            photo_url: null,
            gender: "male",
            birth_date: "2015-03-01",
            grade: "3",
            class_name: "초등부",
            seat_no: 5,
            note: null,
            can_go_alone: true,
            guardian_phone: "010-1111-2222",
          },
        }),
      ),
    );

    const result = await getStudentDetail("stu-1");

    expect(result.canGoAlone).toBe(true);
    expect(result.seatNo).toBe(5);
    expect(result.gender).toBe("male");
  });
});
