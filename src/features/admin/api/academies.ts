import { apiFetch } from "@/shared/lib/http";
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
  id: number;
  code: string;
  name: string;
  region: string;
  staff_count: number;
  user_count: number;
  status: AcademyStatus;
};

type RawAcademiesResponse = {
  items: RawAcademySummary[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toSummary = (raw: RawAcademySummary): AcademySummaryResponseTypes => ({
  id: raw.id,
  code: raw.code,
  name: raw.name,
  region: raw.region,
  staffCount: raw.staff_count,
  userCount: raw.user_count,
  status: raw.status,
});

// GET /admin/academies (§6.1, ACAD-01, O-01).
export const getAcademies = async (q?: string, status?: AcademyStatus): Promise<AcademiesResponseTypes> => {
  const raw = await apiFetch<RawAcademiesResponse>("/admin/academies", {
    method: "GET",
    query: { q: q || undefined, status },
  });
  return {
    items: raw.items.map(toSummary),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawStaffAccountRef = { account_id: number; name: string; login_id: string };

type RawAcademyDetail = RawAcademySummary & {
  address: string | null;
  contact: string | null;
  memo: string | null;
  staff_accounts: RawStaffAccountRef[];
  stats: { moving_bus_count: number };
};

const toStaffAccountRef = (raw: RawStaffAccountRef): AcademyStaffAccountRefResponseTypes => ({
  accountId: raw.account_id,
  name: raw.name,
  loginId: raw.login_id,
});

// GET /admin/academies/{id} (§6.3, ACAD-03, O-01).
export const getAcademy = async (id: number): Promise<AcademyDetailResponseTypes> => {
  const raw = await apiFetch<RawAcademyDetail>(`/admin/academies/${id}`, { method: "GET" });
  return {
    ...toSummary(raw),
    address: raw.address,
    contact: raw.contact,
    memo: raw.memo,
    staffAccounts: raw.staff_accounts.map(toStaffAccountRef),
    stats: { movingBusCount: raw.stats.moving_bus_count },
  };
};

type RawCreateAcademyResponse = {
  academy_id: number;
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
    academyId: raw.academy_id,
    code: raw.code,
    name: raw.name,
    region: raw.region,
    warnings: raw.warnings,
  };
};

// PATCH /admin/academies/{id} (§6.3, ACAD-04, O-01). code 는 수정 대상 밖 — 요청에 안 싣는다.
export const updateAcademy = async (id: number, payload: UpdateAcademyRequestTypes): Promise<void> => {
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
