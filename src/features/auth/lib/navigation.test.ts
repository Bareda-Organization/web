import { describe, expect, it } from "vitest";
import { decideAuthRedirect } from "./navigation";
import type { AuthSession } from "../types";

// `AuthGateGuard`(features/auth) 가 유일하게 부르는 판정 함수. 보고서 4항이 지목한
// "브라우저 없이도 재현 가능한 순수 분기 로직" 중 하나 — 상태 3종(pending·rejected·active)
// 이 각자 다른 경로로 갈라지는 것을 여기서 고정한다.
const baseSession = (status: AuthSession["status"], role: AuthSession["role"] = "staff"): AuthSession => ({
  accountId: "acc-1",
  role,
  status,
  academy: { id: "aca-1", name: "바래다 A" },
});

describe("decideAuthRedirect", () => {
  it("세션이 없으면 로그인·가입 화면 밖에서는 /login 으로 보낸다", () => {
    expect(decideAuthRedirect(null, "/dashboard")).toBe("/login");
    expect(decideAuthRedirect(null, "/login")).toBeNull();
    expect(decideAuthRedirect(null, "/signup")).toBeNull();
  });

  it("pending 은 /signup-status 밖 어디에 있든 그리로 보낸다", () => {
    const session = baseSession("pending");
    expect(decideAuthRedirect(session, "/dashboard")).toBe("/signup-status");
    expect(decideAuthRedirect(session, "/login")).toBe("/signup-status");
    expect(decideAuthRedirect(session, "/signup-status")).toBeNull();
  });

  it("rejected 도 pending 과 동일하게 /signup-status 에 고정된다", () => {
    const session = baseSession("rejected");
    expect(decideAuthRedirect(session, "/dashboard")).toBe("/signup-status");
    expect(decideAuthRedirect(session, "/signup-status")).toBeNull();
  });

  it("active + staff 는 로그인·가입·대기 화면에서 /dashboard 로 보낸다", () => {
    const session = baseSession("active", "staff");
    expect(decideAuthRedirect(session, "/login")).toBe("/dashboard");
    expect(decideAuthRedirect(session, "/signup-status")).toBe("/dashboard");
    expect(decideAuthRedirect(session, "/dashboard")).toBeNull();
  });

  it("active + system_admin 은 /academies 로 보낸다", () => {
    const session = baseSession("active", "system_admin");
    expect(decideAuthRedirect(session, "/login")).toBe("/academies");
    expect(decideAuthRedirect(session, "/academies")).toBeNull();
  });

  it("active 인데 역할과 안 맞는 경로면 자기 홈으로 되돌린다", () => {
    expect(decideAuthRedirect(baseSession("active", "staff"), "/academies")).toBe("/dashboard");
    expect(decideAuthRedirect(baseSession("active", "system_admin"), "/dashboard")).toBe("/academies");
  });

  // BRIEF-a1.md §2 — "관계자가 주소를 직접 쳐서 (admin) 에 들어가는지" 가 가장 위험한 자리.
  // `/academies` 하나만 걸러내던 옛 구현에서는 아래 7개가 전부 통과(null)됐다 — 8화면
  // 전부를 개별로 확인해야 그 회귀가 다시 나도 잡힌다.
  it("관계자(staff) 는 admin 화면 8개 전부에서 되돌려진다", () => {
    const staff = baseSession("active", "staff");
    const adminPaths = [
      "/academies",
      "/member-approvals",
      "/member-accounts",
      "/monitoring",
      "/blocked-accounts",
      "/emergency-alerts",
      "/force-confirm",
      "/audit-log",
    ];
    for (const path of adminPaths) {
      expect(decideAuthRedirect(staff, path)).toBe("/dashboard");
      // 하위 경로(예: /academies/[id])도 같은 그룹으로 걸려야 한다.
      expect(decideAuthRedirect(staff, `${path}/sub`)).toBe("/dashboard");
    }
  });

  it("admin 경로와 이름이 비슷할 뿐인 관계자 경로는 걸러내지 않는다 (오탐 방지)", () => {
    const staff = baseSession("active", "staff");
    // "/academies-report" 는 "/academies" 로 시작하지만 그 하위 경로가 아니다.
    expect(decideAuthRedirect(staff, "/academies-report")).toBeNull();
  });

  it("역할을 알 수 없는 세션은 admin 화면에서 열리지 않고 닫힌다 (기본값은 거부)", () => {
    // AccountRole 타입 밖의 값이 들어오는 방어적 상황을 가정한다 — 권한을 판정할 수
    // 없을 때 열리는 쪽(null)이 아니라 닫히는 쪽(리다이렉트)이어야 한다.
    const unknownRoleSession = baseSession("active", "unknown_role" as AuthSession["role"]);
    expect(decideAuthRedirect(unknownRoleSession, "/academies")).not.toBeNull();
    expect(decideAuthRedirect(unknownRoleSession, "/monitoring")).not.toBeNull();
  });
});
