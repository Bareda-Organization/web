// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { createManager, deleteManager, getManagers, updateManager } from "./index";

// 매니저 관리 화면(§5.13, MGR-01·02·04, A-12)이 부르는 엔드포인트를 실제 F5-W1
// 전용 백엔드에 붙여 확인한다.
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

describe("manager api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 소속 매니저 5명(기사 3·동승자 2).

  it("getManagers 는 staffA 학원의 매니저 목록을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getManagers(0);

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(["driver", "escort"]).toContain(result.items[0].role);
  });

  // 등록→수정→삭제를 한 시험 안에서 마쳐 시드를 원상태로 되돌린다(2026-09-14 curl 로
  // 먼저 확인한 안전한 자체 정리 경로 — 등록 직후 같은 id 로 삭제하면 200). 시드 매니저
  // 4명을 건드리지 않고 이 시험이 만든 매니저에만 updateManager 를 적용한다.
  it("createManager 로 등록한 매니저를 updateManager 로 고치고 deleteManager 로 지우면 목록에서 사라진다", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const created = await createManager({ name: "실서버계약시험", phone: "010-9999-0000", role: "driver" });
    expect(created.id).toBeGreaterThan(0);

    const updated = await updateManager(created.id, {
      name: "실서버계약시험-수정",
      phone: "010-9999-0001",
      role: "escort",
    });
    expect(updated.name).toBe("실서버계약시험-수정");
    expect(updated.role).toBe("escort");

    await deleteManager(created.id);

    const afterDelete = await getManagers(0);
    expect(afterDelete.items.some((m) => m.id === created.id)).toBe(false);
  });
});
