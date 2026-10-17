import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  SignupDecideRequestTypes,
  SignupDecideResponseTypes,
  SignupRequestItemResponseTypes,
  SignupRequestsResponseTypes,
} from "../types";

type WireSignupRequestItem = WithId<SignupRequestItemResponseTypes, "requestId">;

// 서버 id 는 숫자 — 화면 타입은 문자열
const toItem = (raw: WireSignupRequestItem): SignupRequestItemResponseTypes => ({ ...raw, requestId: asIdString(raw.requestId) });

// GET /staff/signup-requests (§5.1, A-02) — status 기본값은 pending. role=staff 는
// 관리자(§6.5) 몫이라 이 목록에 나오지 않는다.
// `page`·`size` 는 §1.8 공통 페이징(기본 0·20) — 안 넘기면 첫 쪽만 오므로 화면이 Pagination 으로 넘겨 본다.
export const getSignupRequests = async (
  status?: string,
  page = 0,
  size = 20,
): Promise<SignupRequestsResponseTypes> => {
  const raw = await apiFetch<Omit<SignupRequestsResponseTypes, "items"> & { items: WireSignupRequestItem[] }>(
    "/staff/signup-requests",
    { method: "GET", query: { status, page, size } },
  );
  return { ...raw, items: raw.items.map(toItem) };
};

// 기사·동승자 가입 요청만의 대기 건수 — 매니저 관리 화면의 "가입 승인 대기 N건"(Ruling 846 ①).
// `role` 은 반복 키(`role=driver&role=escort`)인데 apiFetch 의 query 는 키당 값 하나라서 경로에 직접 싣는다
// (new URL 이 경로의 쿼리를 읽고, apiFetch 가 붙이는 status·page·size 는 그 뒤에 더해진다).
// 서버가 아직 `role` 을 무시하면 전체 역할의 건수가 온다 — 값이 틀릴 뿐 화면이 깨지지는 않는다.
export const getManagerSignupPendingCount = async (): Promise<number> => {
  const raw = await apiFetch<{ totalCount: number }>("/staff/signup-requests?role=driver&role=escort", {
    method: "GET",
    query: { status: "pending", page: 0, size: 1 },
  });
  return raw.totalCount;
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

  return apiFetch<SignupDecideResponseTypes>(`/staff/signup-requests/${requestId}/decide`, {
    method: "POST",
    body,
  });
};
