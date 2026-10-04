import { redirect } from "next/navigation";

// 루트 경로는 (auth)·(staff)·(admin) 세 라우트 그룹 어디에도 속하지 않아
// `AuthGateGuard` 가 붙지 않는다 — 판정을 여기서 따로 구현하면 `decideAuthRedirect`
// 와 두 벌이 되므로, 판정이 걸리는 `/login` 으로 넘기고 그쪽에 맡긴다.
// 이미 로그인한 사용자는 `/login` 에서 다시 `/dashboard`(staff) ·
// `/overview`(system_admin) 로 갈린다.
export default function Home() {
  redirect("/login");
}
