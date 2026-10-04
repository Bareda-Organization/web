"use client";

// 차량 관리(A-11, §5.12). "기사 미배치 회차" 지표는 오늘 현황의 값을 받아 넘긴다(`useUnassignedRuns`).
import { BusList } from "@/features/bus";
import { useUnassignedRuns } from "../_hooks/useUnassignedRuns";

export default function StaffBusListPage() {
  return <BusList unassignedRuns={useUnassignedRuns()} />;
}
