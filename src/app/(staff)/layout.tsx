// 학원 관계자(A-01~17). (admin) 과 레이아웃·내비게이션을 공유하지 않는다 — 두 역할은
// 권한 범위가 완전히 다르다(`frontend/IMPLEMENTATION_PLAN.md` §1).
// 사이드바 248 · 헤더 56 등 화면 골격은 F3 에서 이 자리에 채운다(`§8.1`).
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
