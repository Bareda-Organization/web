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
});
