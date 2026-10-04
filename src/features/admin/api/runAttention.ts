import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { RunAttentionResponseTypes } from "../types";

type RawRunAttentionResponse = {
  items: { academy_id: string | number; delayed_runs: number; confirm_failed_runs: number }[];
  today?: {
    academy_id: string | number;
    academy_name: string;
    academy_status: "active" | "inactive";
    run_count: number;
    by_status: { idle: number; confirmed: number; moving: number; finished: number };
    delayed_runs: number;
    confirm_failed_runs: number;
  }[];
};

// GET /admin/runs/attention (§6.15, O-05) — 학원별 오늘 지연·확정 실패 회차 수. 문제가 없는 학원은 목록에 없다.
// 학원마다 §6.8 을 부르면 학원 수에 비례해 요청이 늘어서 서버가 한 번에 센다(Ruling 543).
export const getRunAttention = async (): Promise<RunAttentionResponseTypes> => {
  const raw = await apiFetch<RawRunAttentionResponse>("/admin/runs/attention", { method: "GET" });
  return {
    items: raw.items.map((item) => ({
      academyId: asIdString(item.academy_id),
      delayedRuns: item.delayed_runs,
      confirmFailedRuns: item.confirm_failed_runs,
    })),
    today: raw.today
      ? raw.today.map((item) => ({
          academyId: asIdString(item.academy_id),
          academyName: item.academy_name,
          academyStatus: item.academy_status,
          runCount: item.run_count,
          byStatus: item.by_status,
          delayedRuns: item.delayed_runs,
          confirmFailedRuns: item.confirm_failed_runs,
        }))
      : null,
  };
};
