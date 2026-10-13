// 고정 노선 편성 상세 · 정차 순서 최적화(A-08, §5.9). 경유 지점 지정(A-15, §5.15)은 이 화면이 아니라 오늘 운행 상세(`today-run`)의 [경유 지점] 패널에 있다 — 회차 단위(Ruling 893, 325 의 화면 부재를 뒤집음).
import { RouteDetail } from "@/features/route";

// Next.js 16 은 동적 세그먼트의 `params` 를 Promise 로 준다 — 서버 컴포넌트에서 await 해
// 클라이언트 컴포넌트에 그대로 넘긴다(change-approval/[id] 와 동일 패턴). 식별자는 W1 흡수
// 이후 string 이라 변환이 필요 없다.
export default async function StaffRouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RouteDetail routeId={id} />;
}
