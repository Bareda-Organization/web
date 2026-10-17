import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { RunAttentionResponseTypes } from "../types";
import type { WithId } from "./wireId";

type WireRunAttention = {
  items: WithId<RunAttentionResponseTypes["items"][number], "academyId">[];
  today?: WithId<NonNullable<RunAttentionResponseTypes["today"]>[number], "academyId">[] | null;
};

// GET /admin/runs/attention (§6.15, O-05) — 학원별 오늘 지연·확정 실패 회차 수. 문제가 없는 학원은 목록에 없다.
// 학원마다 §6.8 을 부르면 학원 수에 비례해 요청이 늘어서 서버가 한 번에 센다(Ruling 543).
export const getRunAttention = async (): Promise<RunAttentionResponseTypes> => {
  const raw = await apiFetch<WireRunAttention>("/admin/runs/attention", { method: "GET" });
  // 서버 id 는 숫자 — 화면 타입은 문자열 · today 는 서버가 안 주면 null
  return {
    items: raw.items.map((item) => ({ ...item, academyId: asIdString(item.academyId) })),
    today: raw.today ? raw.today.map((item) => ({ ...item, academyId: asIdString(item.academyId) })) : null,
  };
};
