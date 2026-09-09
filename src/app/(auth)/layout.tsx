// 로그인 · 가입 · 승인 대기. 인증 전이라 사이드바·상단 네비게이션이 없다 — (staff)·(admin) 과
// 레이아웃을 공유하지 않는다(`frontend/IMPLEMENTATION_PLAN.md` §1).
//
// 라우트 그룹 레이아웃은 `LayoutProps<경로>` 타입 헬퍼를 쓰지 않는다 — 그 헬퍼는 실제
// URL 세그먼트(`app/dashboard` 등)에 맞춰 타입이 생성되는데, 그룹 폴더(`(auth)`) 는
// URL 에 나타나지 않아 대응하는 세그먼트가 없다.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
