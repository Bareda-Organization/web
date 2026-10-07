import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  SignupDecideRequestTypes,
  SignupDecideResponseTypes,
  SignupRequestItemResponseTypes,
  SignupRequestsResponseTypes,
  SignupRole,
} from "../types";

type RawSignupRequestItem = {
  request_id: string | number;
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
  requestId: asIdString(raw.request_id),
  name: raw.name,
  role: raw.role,
  phone: raw.phone,
  requestedAt: raw.requested_at,
});

// GET /staff/signup-requests (§5.1, A-02) — status 기본값은 pending. role=staff 는
// 관리자(§6.5) 몫이라 이 목록에 나오지 않는다.
// `page`·`size` 는 §1.8 공통 페이징(기본 0·20) — 안 넘기면 첫 쪽만 오므로 화면이 Pagination 으로 넘겨 본다.
export const getSignupRequests = async (
  status?: string,
  page = 0,
  size = 20,
): Promise<SignupRequestsResponseTypes> => {
  const raw = await apiFetch<RawSignupRequestsResponse>("/staff/signup-requests", {
    method: "GET",
    query: { status, page, size },
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

// 기사·동승자 가입 요청만의 대기 건수 — 매니저 관리 화면의 "가입 승인 대기 N건"(Ruling 846 ①).
// `role` 은 반복 키(`role=driver&role=escort`)인데 apiFetch 의 query 는 키당 값 하나라서 경로에 직접 싣는다
// (new URL 이 경로의 쿼리를 읽고, apiFetch 가 붙이는 status·page·size 는 그 뒤에 더해진다).
// 서버가 아직 `role` 을 무시하면 전체 역할의 건수가 온다 — 값이 틀릴 뿐 화면이 깨지지는 않는다.
export const getManagerSignupPendingCount = async (): Promise<number> => {
  const raw = await apiFetch<RawSignupRequestsResponse>("/staff/signup-requests?role=driver&role=escort", {
    method: "GET",
    query: { status: "pending", page: 0, size: 1 },
  });
  return raw.total_count;
};

type RawSignupDecideResponse = {
  account_status: "active" | "rejected";
  decided_at: string;
};

// POST /staff/signup-requests/{id}/decide (§5.2, A-02).
// link 는 accept=true 이고 role 이 parent·student 면 studentIds, driver·escort 면
// managerId 가 필수다 — 안 넣으면 422 LINK_REQUIRED.
export const decideSignupRequest = async (
  requestId: string,
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
