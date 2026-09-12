// 구간 변경 승인 상세(A-05, §5.5·§5.6, UF-M-02).
import { ChangeApprovalDetail } from "@/features/approval";

// Next.js 16 은 동적 세그먼트의 `params` 를 Promise 로 준다 — 서버 컴포넌트에서 await 해
// 숫자 approvalId 로 변환한 뒤 클라이언트 컴포넌트에 넘긴다.
export default async function StaffChangeApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChangeApprovalDetail approvalId={Number(id)} />;
}
