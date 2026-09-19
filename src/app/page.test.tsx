import { describe, expect, it, vi } from "vitest";

// 루트 경로는 세 라우트 그룹((auth)·(staff)·(admin)) 어디에도 속하지 않아
// `AuthGateGuard` 가 걸리지 않는다 — 그래서 `decideAuthRedirect` 가 이 경로를
// 한 번도 보지 못한다. 실제로 뼈대 단계의 자리표시자가 그대로 남아 F3 이 끝난
// 뒤에도 주소창에 `/` 를 치면 "화면 구현은 F3 에서 진행한다" 가 떴다.
// 이 검사는 루트가 인증 판정을 거치는 경로로 넘어가는 것만 고정한다.
const { redirectSpy } = vi.hoisted(() => ({ redirectSpy: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect: redirectSpy }));

import Home from "./page";

describe("루트 경로", () => {
  it("인증 판정을 거치도록 로그인 화면으로 보낸다", () => {
    Home();

    // `/login` 은 (auth) 그룹이라 `AuthGateGuard` 가 붙는다 — 이미 로그인한
    // 사용자는 거기서 다시 `/dashboard`(staff) · `/academies`(system_admin) 로
    // 갈린다. 즉 여기서 역할을 판정하지 않는 것이 의도다.
    expect(redirectSpy).toHaveBeenCalledWith("/login");
  });
});
