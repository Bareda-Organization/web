// 관계자 계정 목록 · 정보 수정 · 재직 상태 전환(O-02, §6.6~§6.7).
import { Suspense } from "react";
import { MemberAccountsPage } from "@/features/admin";

// 학원 상세의 [계정 관리] 가 `?academy=` 로 열 수 있어 쿼리 읽기를 Suspense 로 감싼다(useSearchParams 요구사항).
export default function AdminMemberAccountsPage() {
  return (
    <Suspense fallback={null}>
      <MemberAccountsPage />
    </Suspense>
  );
}
