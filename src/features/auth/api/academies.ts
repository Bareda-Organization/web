import { apiFetch } from "@/shared/lib/http";
import type { AcademySearchResponseTypes, AcademySummaryResponseTypes } from "../types";

// GET /academies/search (§2.1, AUTH-02) — 비인증 허용. q 는 학원명·코드 양쪽 매칭.
export const searchAcademies = async (q: string): Promise<AcademySummaryResponseTypes[]> => {
  const response = await apiFetch<AcademySearchResponseTypes>("/academies/search", {
    method: "GET",
    query: { q },
  });
  return response.items;
};
