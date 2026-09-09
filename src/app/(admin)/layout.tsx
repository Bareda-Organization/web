// 메인 관리자(O-01~07). (staff) 와 레이아웃·내비게이션을 공유하지 않는다 —
// 전 학원 범위 관제라 사이드바 구성 자체가 다르다(`frontend/IMPLEMENTATION_PLAN.md` §1 · §3.4).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
