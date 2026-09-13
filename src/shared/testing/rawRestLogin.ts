// 실서버 계약 시험 전용 로그인 헬퍼 — `shared/lib/ws/wsRealBackendAuth.test.ts` 가
// 이미 쓰던 raw REST 로그인 패턴을 여러 시험 파일이 공유하도록 뽑아냈다.
//
// `features/auth` 의 `login()` 대신 이 헬퍼를 쓰는 이유(판단 근거, 보고서 §1과 동일) —
// `accessTokenStore.ts` 는 앱 전역에서 공유하는 슬롯 하나뿐이라, 한 시험 파일 안에서
// 여러 계정(staffA·staffB 등)으로 연달아 로그인하면 나중 로그인이 앞 로그인의 토큰을
// 덮어써 버린다. 이 헬퍼는 토큰 문자열만 돌려주고 그 슬롯에 넣는 시점은 호출부(각
// 시험의 `setAccessToken` 호출)가 스스로 정하게 해 그 문제를 피한다.
//
// 앱 코드는 이 파일을 부르지 않는다(시험 전용) — `realBackendTarget.ts` 와 같은 경계.
export async function rawRestLogin(apiBaseUrl: string, loginId: string, password = "password"): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
    body: JSON.stringify({ login_id: loginId, password }),
  });
  const json = (await response.json()) as { data?: { access_token?: string } };
  const token = json.data?.access_token;
  if (!response.ok || !token) {
    throw new Error(`로그인 실패(${loginId}): status=${response.status} body=${JSON.stringify(json)}`);
  }
  return token;
}
