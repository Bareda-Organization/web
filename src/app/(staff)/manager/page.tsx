"use client";

// 매니저 관리(A-12, §5.13). 기사 미배치 회차(오늘 현황)와 가입 승인 대기 건수는 다른 기능의 값이라 이 페이지가 받아 넘긴다
// (`manager` 가 `run` · `approval` 을 직접 읽지 않는다 — 기능 간 경계). 가입 승인 대기는 기사·동승자 요청만이다(Ruling 846 ①).
import { ManagerList } from "@/features/manager";
import { useManagerSignupCount } from "../_hooks/useManagerSignupCount";
import { useUnassignedRuns } from "../_hooks/useUnassignedRuns";

export default function StaffManagerListPage() {
  return <ManagerList unassignedRuns={useUnassignedRuns()} pendingSignupCount={useManagerSignupCount()} />;
}
