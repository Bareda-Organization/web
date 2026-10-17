import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type { ManagerRole, ManagerSummaryResponseTypes } from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열.
type WireManagers = { items: WithId<ManagerSummaryResponseTypes, "id">[]; hasNext: boolean };

// 후보 한 쪽의 크기 — §1.8 의 상한. 기본값(20)에 맡기면 앞 20명만 온다.
export const MANAGER_CANDIDATE_LIMIT = 100;

// GET /staff/managers?role=&size= (§5.13, MGR-01) — §5.14 배치 대화상자의 후보 목록을 채우는
// 부수 조회다. 담당 절 목록엔 없지만 배치 화면이 성립하려면 후보가 있어야 해서
// 읽기 전용으로만 가져다 쓴다.
// 역할별로 따로 받아 한 역할이 상한을 채워도 다른 역할 후보를 밀어내지 않고, `hasNext` 로 잘림을 알린다.
export const getManagers = async (
  role: ManagerRole,
): Promise<{ items: ManagerSummaryResponseTypes[]; hasNext: boolean }> => {
  const raw = await apiFetch<WireManagers>("/staff/managers", {
    method: "GET",
    query: { role, size: MANAGER_CANDIDATE_LIMIT },
  });
  return {
    items: raw.items.map((m) => ({ ...m, id: asIdString(m.id) })),
    hasNext: raw.hasNext,
  };
};
