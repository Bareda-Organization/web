import { apiFetch } from "@/shared/lib/http";
import type {
  SignupDecideRequestTypes,
  SignupDecideResponseTypes,
  SignupRequestItemResponseTypes,
  SignupRequestsResponseTypes,
  SignupRole,
} from "../types";

type RawSignupRequestItem = {
  request_id: number;
  name: string;
  role: SignupRole;
  phone: string;
  requested_at: string;
};

type RawSignupRequestsResponse = {
  items: RawSignupRequestItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
  pending_count: number;
};

const toItem = (raw: RawSignupRequestItem): SignupRequestItemResponseTypes => ({
  requestId: raw.request_id,
  name: raw.name,
  role: raw.role,
  phone: raw.phone,
  requestedAt: raw.requested_at,
});

// GET /staff/signup-requests (§5.1, A-02) — status 기본값은 pending. role=staff 는
// 관리자(§6.5) 몫이라 이 목록에 나오지 않는다.
export const getSignupRequests = async (status?: string): Promise<SignupRequestsResponseTypes> => {
  const raw = await apiFetch<RawSignupRequestsResponse>("/staff/signup-requests", {
    method: "GET",
    query: status ? { status } : undefined,
  });
  return {
    items: raw.items.map(toItem),
    pendingCount: raw.pending_count,
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawSignupDecideResponse = {
  account_status: "active" | "rejected";
  decided_at: string;
};

// POST /staff/signup-requests/{id}/decide (§5.2, A-02).
// link 는 accept=true 이고 role 이 parent·student 면 studentIds, driver·escort 면
// managerId 가 필수다 — 안 넣으면 422 LINK_REQUIRED.
export const decideSignupRequest = async (
  requestId: number,
  payload: SignupDecideRequestTypes,
): Promise<SignupDecideResponseTypes> => {
  const body: Record<string, unknown> = { accept: payload.accept };
  if (payload.rejectReason !== undefined) {
    body.reject_reason = payload.rejectReason;
  }
  if (payload.link) {
    const link: Record<string, unknown> = {};
    if (payload.link.studentIds !== undefined) {
      link.student_ids = payload.link.studentIds;
    }
    if (payload.link.managerId !== undefined) {
      link.manager_id = payload.link.managerId;
    }
    body.link = link;
  }

  const raw = await apiFetch<RawSignupDecideResponse>(`/staff/signup-requests/${requestId}/decide`, {
    method: "POST",
    body,
  });
  return { accountStatus: raw.account_status, decidedAt: raw.decided_at };
};
