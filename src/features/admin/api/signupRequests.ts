import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  PagingRequest,
  StaffSignupAcademyRefResponseTypes,
  StaffSignupDecideRequestTypes,
  StaffSignupDecideResponseTypes,
  StaffSignupRequestItemResponseTypes,
  StaffSignupRequestsResponseTypes,
} from "../types";
import type { WithId } from "./wireId";

type WireSignupRequestItem = Omit<WithId<StaffSignupRequestItemResponseTypes, "requestId">, "academy"> & {
  academy: WithId<StaffSignupAcademyRefResponseTypes, "id">;
};

// 서버 id 는 숫자 · currentStaff 는 없으면 null (§6.4, Ruling 807)
const toSignupRequestItem = (raw: WireSignupRequestItem): StaffSignupRequestItemResponseTypes => ({
  ...raw,
  requestId: asIdString(raw.requestId),
  academy: { ...raw.academy, id: asIdString(raw.academy.id) },
  currentStaff: raw.currentStaff ?? null,
});

// GET /admin/staff-signup-requests (§6.4, O-02).
export const getStaffSignupRequests = async (paging: PagingRequest = {}): Promise<StaffSignupRequestsResponseTypes> => {
  const raw = await apiFetch<Omit<StaffSignupRequestsResponseTypes, "items"> & { items: WireSignupRequestItem[] }>(
    "/admin/staff-signup-requests",
    { method: "GET", query: { page: paging.page, size: paging.size } },
  );
  return { ...raw, items: raw.items.map(toSignupRequestItem) };
};

// POST /admin/staff-signup-requests/{id}/decide (§6.5, O-02).
// accept=false 일 때 reject_reason 이 필수 — 화면 쪽에서 빈 문자열을 막는다.
export const decideStaffSignupRequest = async (
  requestId: string,
  payload: StaffSignupDecideRequestTypes,
): Promise<StaffSignupDecideResponseTypes> => {
  return apiFetch<StaffSignupDecideResponseTypes>(`/admin/staff-signup-requests/${requestId}/decide`, {
    method: "POST",
    body: { accept: payload.accept, reject_reason: payload.rejectReason },
  });
};
