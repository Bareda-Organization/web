// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { createStudent, deleteStudent, getStudentDetail, getStudents, updateStudent } from "./index";

// 학생 관리 화면(§5.11, STU-01~04, A-10)이 부르는 엔드포인트를 실제 F5-W1
// 전용 백엔드에 붙여 확인한다. 등록·수정·퇴원(STU-02~04)은 사진 없이도 요청이
// 성립한다(`StudentUpsertRequestTypes.photo` 는 선택) — 사진 업로드 자체까지
// 실측하려면 실제 파일이 필요해 그 부분만 이 계약 시험의 범위를 벗어난다.
// 등록으로 만든 학생을 같은 시험 안에서 퇴원(soft delete)시켜 정리한다 —
// 퇴원은 즉시 목록·상세 조회에서 빠지므로(2026-09-17 curl 로 확인, 상세는
// 404 STUDENT_NOT_FOUND) 반복 실행에 안전하고 시드 학생 5명을 건드리지 않는다.
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

describe("student api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 소속 학생 5명(student_id 1~5).

  it("getStudents 는 staffA 학원의 학생 목록을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getStudents(0);

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(typeof result.items[0].studentId).toBe("string");
  });

  it("getStudentDetail 은 student_id=1 의 상세를 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getStudentDetail("1");

    expect(result.studentId).toBe("1");
    expect(typeof result.name).toBe("string");
    expect(typeof result.canGoAlone).toBe("boolean");
  });

  it("createStudent 로 등록한 학생을 updateStudent 로 고치고 deleteStudent(퇴원)로 지우면 목록·상세에서 사라진다", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const created = await createStudent({ name: "실서버계약시험", canGoAlone: true });
    try {
      expect(created.studentId).toBeTruthy();
      expect(created.canGoAlone).toBe(true);

      const updated = await updateStudent(created.studentId, {
        name: "실서버계약시험-수정",
        canGoAlone: false,
        grade: "6",
      });
      expect(updated.name).toBe("실서버계약시험-수정");
      expect(updated.canGoAlone).toBe(false);
      expect(updated.grade).toBe("6");
    } finally {
      await deleteStudent(created.studentId);
    }

    const afterDelete = await getStudents(0, 50);
    expect(afterDelete.items.some((s) => s.studentId === created.studentId)).toBe(false);

    await expect(getStudentDetail(created.studentId)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
      expect((error as ApiError).code).toBe("STUDENT_NOT_FOUND");
      return true;
    });
  });
});
