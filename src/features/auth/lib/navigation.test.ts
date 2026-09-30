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

  // F03-12 — 접근 판정의 단위는 경로 목록이 아니라 라우트 그룹이다. (admin) 레이아웃은 system_admin,
  // (staff) 레이아웃은 staff 를 요구한다고 알리고, 이 함수는 세션 역할이 그와 다르면 자기 홈으로 보낸다.
  it("active 인데 그룹이 요구하는 역할과 다르면 자기 홈으로 되돌린다", () => {
    expect(decideAuthRedirect(baseSession("active", "staff"), "/academies", "system_admin")).toBe("/dashboard");
    expect(decideAuthRedirect(baseSession("active", "system_admin"), "/dashboard", "staff")).toBe("/academies");
    expect(decideAuthRedirect(baseSession("active", "staff"), "/dashboard", "staff")).toBeNull();
    expect(decideAuthRedirect(baseSession("active", "system_admin"), "/academies", "system_admin")).toBeNull();
  });

  // BRIEF-a1.md §2 — "관계자가 주소를 직접 쳐서 (admin) 에 들어가는지" 가 가장 위험한 자리.
  // 경로 목록에 등록하지 않은 새 화면 폴더도 그 그룹 안에 있으면 자동으로 막혀야 한다(기본은 거부).
  it("경로 목록에 없는 새 화면도 그룹 역할이 다르면 닫힌다", () => {
    expect(decideAuthRedirect(baseSession("active", "staff"), "/brand-new-admin-screen", "system_admin")).toBe("/dashboard");
    expect(decideAuthRedirect(baseSession("active", "system_admin"), "/brand-new-staff-screen/sub", "staff")).toBe("/academies");
  });

  it("역할을 알 수 없는 세션은 어느 그룹에서도 열리지 않고 닫힌다 (기본값은 거부)", () => {
    // AccountRole 타입 밖의 값이 들어오는 방어적 상황을 가정한다 — 권한을 판정할 수
    // 없을 때 열리는 쪽(null)이 아니라 닫히는 쪽(리다이렉트)이어야 한다.
    const unknownRoleSession = baseSession("active", "unknown_role" as AuthSession["role"]);
    expect(decideAuthRedirect(unknownRoleSession, "/academies", "system_admin")).not.toBeNull();
    expect(decideAuthRedirect(unknownRoleSession, "/dashboard", "staff")).not.toBeNull();
  });
});
