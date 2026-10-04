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

type RawAcademyRef = { id: string | number; code: string; name: string; region: string };

const toAcademyRef = (raw: RawAcademyRef): StaffSignupAcademyRefResponseTypes => ({
  id: asIdString(raw.id),
  code: raw.code,
  name: raw.name,
  region: raw.region,
});

type RawSignupRequestItem = {
  request_id: string | number;
  name: string;
  phone: string;
  academy: RawAcademyRef;
  requested_at: string;
  academy_staff_count: number;
  // §6.4 current_staff(Ruling 807) — 서버가 아직 안 주면 없다.
  current_staff?: { name: string; login_id: string; last_login_at: string | null } | null;
};

type RawSignupRequestsResponse = {
  items: RawSignupRequestItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toSignupRequestItem = (raw: RawSignupRequestItem): StaffSignupRequestItemResponseTypes => ({
  requestId: asIdString(raw.request_id),
  name: raw.name,
  phone: raw.phone,
  academy: toAcademyRef(raw.academy),
  requestedAt: raw.requested_at,
  academyStaffCount: raw.academy_staff_count,
  currentStaff: raw.current_staff ? { name: raw.current_staff.name, loginId: raw.current_staff.login_id, lastLoginAt: raw.current_staff.last_login_at } : null,
});

// GET /admin/staff-signup-requests (§6.4, O-02).
export const getStaffSignupRequests = async (paging: PagingRequest = {}): Promise<StaffSignupRequestsResponseTypes> => {
  const raw = await apiFetch<RawSignupRequestsResponse>("/admin/staff-signup-requests", {
    method: "GET",
    query: { page: paging.page, size: paging.size },
  });
  return {
    items: raw.items.map(toSignupRequestItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawDecideResponse = { account_status: "active" | "rejected"; decided_at: string };

// POST /admin/staff-signup-requests/{id}/decide (§6.5, O-02).
// accept=false 일 때 reject_reason 이 필수 — 화면 쪽에서 빈 문자열을 막는다.
export const decideStaffSignupRequest = async (
  requestId: string,
  payload: StaffSignupDecideRequestTypes,
): Promise<StaffSignupDecideResponseTypes> => {
  const raw = await apiFetch<RawDecideResponse>(`/admin/staff-signup-requests/${requestId}/decide`, {
    method: "POST",
    body: { accept: payload.accept, reject_reason: payload.rejectReason },
  });
  return { accountStatus: raw.account_status, decidedAt: raw.decided_at };
};
