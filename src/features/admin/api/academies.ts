import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { PagingRequest } from "../types";
import type {
  AcademiesResponseTypes,
  AcademyDetailResponseTypes,
  AcademyStatus,
  AcademyStaffAccountRefResponseTypes,
  AcademySummaryResponseTypes,
  CreateAcademyRequestTypes,
  CreateAcademyResponseTypes,
  UpdateAcademyRequestTypes,
} from "../types";

type RawAcademySummary = {
  id: string | number;
  code: string;
  name: string;
  region: string;
  staff_count: number;
  user_count: number;
  status: AcademyStatus;
  // R48 Ruling 806 — 서버가 아직 안 주면 없다.
  has_address?: boolean;
  pending_signup_count?: number;
};

type RawAcademiesResponse = {
  summary?: { total: number; active: number; inactive: number; user_count: number } | null;
  items: RawAcademySummary[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toSummary = (raw: RawAcademySummary): AcademySummaryResponseTypes => ({
  id: asIdString(raw.id),
  code: raw.code,
  name: raw.name,
  region: raw.region,
  staffCount: raw.staff_count,
  userCount: raw.user_count,
  status: raw.status,
  hasAddress: raw.has_address,
  pendingSignupCount: raw.pending_signup_count,
});

// GET /admin/academies (§6.1, ACAD-01, O-01). §1.8 페이징 — 안 넘기면 서버는 첫 20건만 준다.
export const getAcademies = async (
  q?: string,
  status?: AcademyStatus,
  paging: PagingRequest = {},
): Promise<AcademiesResponseTypes> => {
  const raw = await apiFetch<RawAcademiesResponse>("/admin/academies", {
    method: "GET",
    query: { q: q || undefined, status, page: paging.page, size: paging.size },
  });
  return {
    summary: raw.summary ? { total: raw.summary.total, active: raw.summary.active, inactive: raw.summary.inactive, userCount: raw.summary.user_count } : null,
    items: raw.items.map(toSummary),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

const ALL_ACADEMIES_PAGE_SIZE = 100;
// 학원이 이만큼 늘어도 무한 루프가 되지 않게 거는 안전 상한(100건 × 50쪽 = 5,000곳).
const ALL_ACADEMIES_MAX_PAGES = 50;

// 학원 선택 목록(전체 관제 · 강제 확정)용 — 첫 쪽만 받으면 21번째 이후 학원의 회차는 관제도 강제 확정도 못 한다.
export const getAllAcademies = async (): Promise<AcademySummaryResponseTypes[]> => {
  const all: AcademySummaryResponseTypes[] = [];
  for (let page = 0; page < ALL_ACADEMIES_MAX_PAGES; page += 1) {
    const data = await getAcademies(undefined, undefined, { page, size: ALL_ACADEMIES_PAGE_SIZE });
    all.push(...data.items);
    if (!data.hasNext) break;
  }
  return all;
};

type RawStaffAccountRef = { account_id: string | number; name: string; login_id: string; last_login_at?: string | null; status: string };

type RawAcademyDetail = RawAcademySummary & {
  address: string | null;
  contact: string | null;
  memo: string | null;
  staff_accounts: RawStaffAccountRef[];
  stats: { moving_bus_count: number; moving_bus_nos?: string[] };
};

const toStaffAccountRef = (raw: RawStaffAccountRef): AcademyStaffAccountRefResponseTypes => ({
  accountId: asIdString(raw.account_id),
  name: raw.name,
  loginId: raw.login_id,
  lastLoginAt: raw.last_login_at ?? null,
  status: raw.status === "inactive" ? "inactive" : "active",
});

// GET /admin/academies/{id} (§6.3, ACAD-03, O-01).
export const getAcademy = async (id: string): Promise<AcademyDetailResponseTypes> => {
  const raw = await apiFetch<RawAcademyDetail>(`/admin/academies/${id}`, { method: "GET" });
  return {
    ...toSummary(raw),
    address: raw.address,
    contact: raw.contact,
    memo: raw.memo,
    staffAccounts: raw.staff_accounts.map(toStaffAccountRef),
    stats: { movingBusCount: raw.stats.moving_bus_count, movingBusNos: raw.stats.moving_bus_nos ?? [] },
  };
};

type RawCreateAcademyResponse = {
  academy_id: string | number;
  code: string;
  name: string;
  region: string;
  warnings: string[];
};

// POST /admin/academies (§6.2, ACAD-02, O-01). code 는 서버 자동 생성 — 요청에 없다.
// 학원명+지역 중복은 저장을 막지 않고 warnings[] 로만 알린다.
export const createAcademy = async (payload: CreateAcademyRequestTypes): Promise<CreateAcademyResponseTypes> => {
  const raw = await apiFetch<RawCreateAcademyResponse>("/admin/academies", {
    method: "POST",
    body: {
      name: payload.name,
      region: payload.region,
      address: payload.address,
      contact: payload.contact,
      memo: payload.memo,
    },
  });
  return {
    academyId: asIdString(raw.academy_id),
    code: raw.code,
    name: raw.name,
    region: raw.region,
    warnings: raw.warnings,
  };
};

// PATCH /admin/academies/{id} (§6.3, ACAD-04, O-01). code 는 수정 대상 밖 — 요청에 안 싣는다.
export const updateAcademy = async (id: string, payload: UpdateAcademyRequestTypes): Promise<void> => {
  await apiFetch<void>(`/admin/academies/${id}`, {
    method: "PATCH",
    body: {
      name: payload.name,
      region: payload.region,
      address: payload.address,
      contact: payload.contact,
      memo: payload.memo,
      status: payload.status,
    },
  });
};
