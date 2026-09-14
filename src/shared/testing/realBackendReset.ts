// 실서버 계약 시험이 항상 같은 시드 상태에서 출발하게 한다 — F5 에서 앱 2종(부모·매니저)이
// 이미 갖춘 조건부 `POST /dev/reset` 을 관계자 웹에도 마련한다
// (`apps/parent-app/test/support/real_backend_target.dart` 의 `ensureParentSeedIsSafeForTiming`
// 이 본보기, FE-R3 W3 목표 10).
//
// ⚠ Dart 쪽과 조건이 다르다 — 판단 근거(보고서 §1). Dart 는 "출발 시각이 임박해 마르는
// 자원 하나"를 콕 집어 그 조건이 참일 때만 초기화한다. 이 저장소의 14개 실서버 계약 시험
// 파일을 전수 확인한 결과(academy·admin·approval·auth·bus·emergency·manager·notification·
// report·route·run·schedule·student·ws), 마르는 자원에 기대는 시험이 하나도 없다 — 등록한
// 것은 같은 시험 안에서 스스로 지우고(매니저·노선), 바꾼 값은 스스로 되돌리고(학원 설정
// 3→5→3), 상태에 따라 분기해서 단언한다(관리자 계정 차단 여부). 즉 "그 자원이 아직
// 마르지 않았는가" 를 콕 집어 검사할 대상 자체가 없다. 그래서 이 파일의 조건은 주소가
// 설정돼 있고 그 백엔드가 실제로 응답하는가 하나뿐이다 — 단위 시험(주소 미설정)에는
// 관여하지 않고, 실서버 시험인데 서버가 꺼져 있으면 각 파일의 자체 `backendReachable`
// 건너뛰기 판정에 맡긴다(이 파일이 오류를 던지면 그 판정 기회 자체가 사라진다).
//
// 앱 코드는 이 파일을 부르지 않는다(시험 전용) — `realBackendTarget.ts` 와 같은 경계.

/** 초기화 요청에 쓸 시드 계정 — 모든 실서버 계약 시험이 이미 전제하는 staffA. */
const RESET_LOGIN_ID = "staffA";

/**
 * `NEXT_PUBLIC_API_BASE_URL` 이 설정돼 있고 그 백엔드가 응답하면 `POST /dev/reset` 으로
 * DB 를 시드 상태로 되돌린다. vitest `globalSetup` 에서 시험 전체를 통틀어 정확히 한 번
 * 불린다 — 개별 시험 파일이 아니라 실행 1회당 1회이어야 하므로 `beforeAll`(파일마다 실행)
 * 이 아니라 `globalSetup`(러너 전체에서 1회)에 둔다.
 */
export async function resetRealBackendSeedIfConfigured(): Promise<void> {
  const host = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!host) {
    // 단위 시험 실행(주소 미지정) — 관여하지 않는다.
    return;
  }
  const apiBaseUrl = `${host.replace(/\/+$/, "")}/api/v1`;

  try {
    const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
      body: JSON.stringify({ login_id: RESET_LOGIN_ID, password: "password" }),
    });
    const loginJson = (await loginResponse.json().catch(() => null)) as { data?: { access_token?: string } } | null;
    const token = loginJson?.data?.access_token;
    if (!loginResponse.ok || !token) {
      // 백엔드가 응답은 했지만 로그인이 실패 — 각 시험 파일의 자체 판정에 맡기고 조용히 지나간다.
      return;
    }

    const resetResponse = await fetch(`${apiBaseUrl}/dev/reset`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "X-Client-Type": "web" },
    });
    if (!resetResponse.ok) {
      // local 프로파일이 아니거나 app.dev-tools.reset.enabled=false 인 환경일 수 있다 —
      // 이 라운드의 판단 근거대로 새 엔드포인트를 만들지 않으므로 여기서도 조용히 넘어간다.
      return;
    }
  } catch {
    // 백엔드 미기동 — 각 시험 파일의 `backendReachable` 판정이 건너뛰기로 처리한다.
  }
}
