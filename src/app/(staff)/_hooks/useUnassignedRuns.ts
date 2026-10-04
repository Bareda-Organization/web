"use client";

// 오늘 현황(§5.3)에서 기사가 안 정해진 회차 — 차량 관리 · 매니저 관리 화면의 "기사 미배치" 표시가 같이 쓴다.
// 두 기능(`bus` · `manager`)이 `run` 을 직접 읽지 못하니(기능 간 경계) 페이지가 받아 화면에 넘긴다.
// 받지 못했으면 null — 화면은 값을 단정하지 않는다.
import { useEffect, useState } from "react";
import { getDashboard } from "@/features/run";

export type UnassignedRun = { busNo: string; direction: "to_academy" | "from_academy"; departTime: string };

export const useUnassignedRuns = (): UnassignedRun[] | null => {
  const [runs, setRuns] = useState<UnassignedRun[] | null>(null);

  useEffect(() => {
    let alive = true;
    getDashboard()
      .then((dashboard) => {
        if (!alive) return;
        setRuns(
          dashboard.runs
            .filter((run) => run.driverName === null && run.runStatus !== "finished")
            .map((run) => ({ busNo: run.busNo, direction: run.direction, departTime: run.departTime })),
        );
      })
      .catch(() => alive && setRuns(null));
    return () => {
      alive = false;
    };
  }, []);

  return runs;
};
