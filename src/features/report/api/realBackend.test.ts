// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { getReports } from "./index";

// 예외 보고 조회 화면(§5.20, EXC-02·03, M-14)이 부르는 엔드포인트를 실제
// F5-W1 전용 백엔드에 붙여 확인한다. 조회 전용 화면이며, 보고 생성은 기사·
// 동승자 쪽(§4.13) 몫이라 이 계약 시험 범위 밖이다.
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

describe("report api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 학원은 보고 0건(2026-09-14 curl 확인).
  // §5.20 은 §1.8 페이징을 안 쓴다(items 만) — 이 봉투 형태 자체가 검증 대상이다.

  it("getReports 는 0건이어도 items 배열 형태를 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getReports();

    expect(Array.isArray(result.items)).toBe(true);
  });

  // 원본 응답 봉투 자체를 확인한다 — §1.8 페이징 필드(page·size·total_count·has_next)가
  // 정말 없는지는 매핑을 거친 프런트 타입만으로는 못 본다(toItem 이 애초에 그 필드를
  // 옮기지 않으므로 백엔드가 실어 보내도 항상 통과해 버린다). 그래서 raw fetch 로 직접 본다.
  it("GET /staff/reports 원본 응답에는 §1.8 페이징 필드가 없다(실측 확인, types/index.ts 주석)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    const token = await rawRestLogin(API_BASE_URL, "staffA");

    const response = await fetch(`${API_BASE_URL}/staff/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await response.json()) as { data: Record<string, unknown> };

    expect(json.data).toHaveProperty("items");
    expect(json.data).not.toHaveProperty("page");
    expect(json.data).not.toHaveProperty("total_count");
    expect(json.data).not.toHaveProperty("has_next");
  });
});
