import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { ManagerRole, ManagerSummaryResponseTypes } from "../types";

type RawManager = {
  id: string | number;
  name: string;
  phone: string;
  role: ManagerRole;
};

type RawManagersResponse = {
  items: RawManager[];
};

// GET /staff/managers?q= (§5.13, MGR-01) — §5.14 배치 대화상자의 후보 목록을 채우는
// 부수 조회다. 담당 절 목록엔 없지만 배치 화면이 성립하려면 후보가 있어야 해서
// 읽기 전용으로만 가져다 쓴다(보고서 §1 판단 근거에 기록).
// 실제 응답은 `{items: [...]}` 로 감싸져 있다(2026-09-12 curl 확인) — §5.4 roster 와
// 반대로 이쪽은 문서·실제가 일치한다.
export const getManagers = async (query?: string): Promise<ManagerSummaryResponseTypes[]> => {
  const raw = await apiFetch<RawManagersResponse>("/staff/managers", {
    method: "GET",
    query: query ? { q: query } : undefined,
  });
  return raw.items.map((m) => ({ id: asIdString(m.id), name: m.name, phone: m.phone, role: m.role }));
};
