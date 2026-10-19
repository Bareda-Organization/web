import { apiFetch } from "@/shared/lib/http";
import { setAccessToken } from "@/shared/lib/http";
import type { LoginResponseTypes } from "../types";

// POST /auth/login (§2.5, AUTH-04·05) — 비인증 허용. X-Client-Type: web 은
// httpClient.ts 가 항상 붙이므로 여기서 따로 지정하지 않는다 — refresh_token 은
// 본문에 오지 않고 Set-Cookie 로만 온다(§1.2.1).
export const login = async (loginId: string, password: string): Promise<LoginResponseTypes> => {
  const response = await apiFetch<LoginResponseTypes>("/auth/login", {
    method: "POST",
    body: { login_id: loginId, password },
  });
  setAccessToken(response.accessToken);
  return response;
};
