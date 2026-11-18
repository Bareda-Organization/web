import { apiFetch, MalformedResponseError } from "@/shared/lib/http";
import type { MeResponseTypes } from "../types";

const ROLES = ["parent", "student", "driver", "escort", "staff", "system_admin"];
const STATUSES = ["pending", "active", "rejected"];

// 세션을 만드는 데 쓰는 필수 필드(§2.10 ●)만 본다 — 선택 필드는 없어도 되고, 모르는 필드는 무시한다.
// 서버 id 는 JSON 숫자로 올 수 있어 accountId 는 문자열·숫자를 모두 받는다.
const isMeResponse = (value: unknown): value is MeResponseTypes => {
  const me = value as Record<string, unknown> | null;
  return (
    typeof me === "object" &&
    me !== null &&
    (typeof me.accountId === "string" || typeof me.accountId === "number") &&
    typeof me.loginId === "string" &&
    typeof me.name === "string" &&
    typeof me.phone === "string" &&
    typeof me.role === "string" &&
    ROLES.includes(me.role) &&
    typeof me.status === "string" &&
    STATUSES.includes(me.status) &&
    typeof me.mustChangePassword === "boolean"
  );
};

// GET /me (§2.10) — pending·rejected 포함 전 역할 허용. `POST /auth/refresh` 가
// 토큰 2개만 주기 때문에, 새로고침 뒤 role·status 를 다시 얻는 유일한 경로다
// (API_SPEC §2.10 "이 엔드포인트가 필요한 이유"). AuthSessionProvider 부트스트랩이 쓴다.
export const getMe = async (): Promise<MeResponseTypes> => {
  const me = await apiFetch<unknown>("/me", { method: "GET" });
  if (!isMeResponse(me)) {
    throw new MalformedResponseError();
  }
  return me;
};
