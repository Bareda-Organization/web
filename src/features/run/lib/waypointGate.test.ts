import { describe, expect, it } from "vitest";
import { waypointAccess } from "./waypointGate";

// Ruling 893 — [경유 지점] 은 학원 관계자(STAFF)에게만, 확정된 시작 전 회차에만 보인다.
// 마감 시각(출발+10분)은 화면이 시계로 계산하지 않고 서버의 403 CHANGE_WINDOW_CLOSED 로 처리한다.
describe("waypointAccess", () => {
  it("학원 관계자 + 확정된 회차만 연다", () => {
    expect(waypointAccess("staff", "confirmed")).toEqual({ kind: "open" });
  });

  it("학원 관계자가 아니면 단추도 이유도 없다 — 메인 관리자는 ROUTE_MANAGE 가 없어 403", () => {
    expect(waypointAccess("system_admin", "confirmed")).toEqual({ kind: "hidden" });
    expect(waypointAccess(undefined, "confirmed")).toEqual({ kind: "hidden" });
  });

  it("확정 전(idle)은 이유 한 줄로 막는다", () => {
    const access = waypointAccess("staff", "idle");
    expect(access.kind).toBe("blocked");
    expect(access.kind === "blocked" && access.reason).toContain("확정");
  });

  it("운행이 시작됐거나 끝난 회차는 이유 한 줄로 막는다", () => {
    for (const status of ["moving", "finished"] as const) {
      const access = waypointAccess("staff", status);
      expect(access.kind).toBe("blocked");
      expect(access.kind === "blocked" && access.reason).toContain("운행");
    }
  });
});
