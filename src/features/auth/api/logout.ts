import { apiFetch, setAccessToken } from "@/shared/lib/http";

// POST /auth/logout (§2.7, AUTH-09) — pending 포함 전 역할 허용. 성공은 204.
// refresh 쿠키 삭제 지시는 서버 Set-Cookie 가 처리하므로 클라이언트는 access 토큰
// 메모리만 비우면 된다.
export const logout = async (): Promise<void> => {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
};
