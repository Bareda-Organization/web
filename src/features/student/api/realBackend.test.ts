// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { getStudentDetail, getStudents } from "./index";

// 학생 관리 화면(§5.11, STU-01, A-10)이 부르는 조회 엔드포인트를 실제 F5-W1
// 전용 백엔드에 붙여 확인한다. 등록·수정·퇴원(STU-02~04)은 multipart·soft
// delete 라 여기서는 조회만 검증하고 쓰기 경로는 화면 결함 없이 넘어간다
// (사진 업로드까지 실측하려면 실제 파일이 필요해 이 계약 시험의 범위를 벗어난다).
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
});
