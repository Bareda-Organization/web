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
import type { WithId } from "@/shared/lib/http/wireId";

type WireAcademySummary = WithId<AcademySummaryResponseTypes, "id">;

// 서버 id 는 숫자 — 화면 타입은 문자열
const toSummary = (raw: WireAcademySummary): AcademySummaryResponseTypes => ({ ...raw, id: asIdString(raw.id) });

// GET /admin/academies (§6.1, ACAD-01, O-01). §1.8 페이징 — 안 넘기면 서버는 첫 20건만 준다.
export const getAcademies = async (
  q?: string,
  status?: AcademyStatus,
  paging: PagingRequest = {},
): Promise<AcademiesResponseTypes> => {
  const raw = await apiFetch<Omit<AcademiesResponseTypes, "items"> & { items: WireAcademySummary[] }>("/admin/academies", {
    method: "GET",
    query: { q: q || undefined, status, page: paging.page, size: paging.size },
  });
  // summary 는 서버가 안 주면 null (Ruling 806)
  return { ...raw, summary: raw.summary ?? null, items: raw.items.map(toSummary) };
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

// status 는 모르는 값이 와도 active 로 본다
type WireStaffAccountRef = Omit<WithId<AcademyStaffAccountRefResponseTypes, "accountId">, "status"> & { status: string };

type WireAcademyDetail = Omit<WithId<AcademyDetailResponseTypes, "id">, "staffAccounts"> & {
  staffAccounts: WireStaffAccountRef[];
};

// 서버 id 는 숫자 · lastLoginAt 은 없으면 null · status 는 active/inactive 둘로 좁힌다
const toStaffAccountRef = (raw: WireStaffAccountRef): AcademyStaffAccountRefResponseTypes => ({
  ...raw,
  accountId: asIdString(raw.accountId),
  lastLoginAt: raw.lastLoginAt ?? null,
  status: raw.status === "inactive" ? "inactive" : "active",
});

// GET /admin/academies/{id} (§6.3, ACAD-03, O-01).
export const getAcademy = async (id: string): Promise<AcademyDetailResponseTypes> => {
  const raw = await apiFetch<WireAcademyDetail>(`/admin/academies/${id}`, { method: "GET" });
  return {
    ...raw,
    id: asIdString(raw.id),
    staffAccounts: raw.staffAccounts.map(toStaffAccountRef),
    // 서버가 안 주면 빈 배열
    stats: { ...raw.stats, movingBusNos: raw.stats.movingBusNos ?? [] },
  };
};

// POST /admin/academies (§6.2, ACAD-02, O-01). code 는 서버 자동 생성 — 요청에 없다.
// 학원명+지역 중복은 저장을 막지 않고 warnings[] 로만 알린다.
export const createAcademy = async (payload: CreateAcademyRequestTypes): Promise<CreateAcademyResponseTypes> => {
  const raw = await apiFetch<WithId<CreateAcademyResponseTypes, "academyId">>("/admin/academies", {
    method: "POST",
    body: {
      name: payload.name,
      region: payload.region,
      address: payload.address,
      contact: payload.contact,
      memo: payload.memo,
    },
  });
  return { ...raw, academyId: asIdString(raw.academyId) };
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
