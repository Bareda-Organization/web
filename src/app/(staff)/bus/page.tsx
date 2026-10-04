"use client";

// 차량 관리(A-11, §5.12). "기사 미배치 회차" 지표는 오늘 현황(§5.3)의 `driver_name` 이 null 인 회차다 —
// `bus` 가 `run` 을 직접 읽지 않으니(기능 간 경계) 이 페이지가 받아 넘긴다. 실패하면 지표 칸을 `-` 로 둔다.
import { useEffect, useState } from "react";
import { BusList } from "@/features/bus";
import type { UnassignedRun } from "@/features/bus";
import { getDashboard } from "@/features/run";

export default function StaffBusListPage() {
  const [unassignedRuns, setUnassignedRuns] = useState<UnassignedRun[] | null>(null);

  useEffect(() => {
    let alive = true;
    getDashboard()
      .then((dashboard) => {
        if (!alive) return;
        setUnassignedRuns(
          dashboard.runs
            .filter((run) => run.driverName === null && run.runStatus !== "finished")
            .map((run) => ({ busNo: run.busNo, direction: run.direction, departTime: run.departTime })),
        );
      })
      .catch(() => alive && setUnassignedRuns(null));
    return () => {
      alive = false;
    };
  }, []);

  return <BusList unassignedRuns={unassignedRuns} />;
}
