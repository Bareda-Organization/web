// 실서버 계약 시험이 붙을 주소를 한 곳에서 정한다 — **주소를 받지 못하면 던진다.**
//
// ⚠ 기본값으로 조용히 `localhost:8080` 에 붙는 경로를 없애는 것이 이 파일의 전부다.
// 그 기본값은 조율자의 시드 서버라, 주소를 빠뜨린 실행이 시드 DB 에 실제 레코드를
// 만든다(2026-09-13 에 3회 발생 · 비상 신고 8건 생성). 발주문의 경고 문구로는 세 번 다
// 막지 못했다 — 실서버 시험을 제외했다고 믿는 상태에서는 주소를 줄 이유가 없기 때문이다.
// 그래서 문구가 아니라 구조로 막는다.
//
// 앱 코드는 이 파일을 부르지 않는다(시험 전용). 앱 런타임의 주소는 `httpClient` 가 정한다.

/** 실서버 계약 시험의 대상 호스트. `NEXT_PUBLIC_API_BASE_URL` 미지정이면 던진다. */
export function requireRealBackendHost(): string {
  const host = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!host) {
    throw new Error(
      "실서버 계약 시험에는 대상 주소가 필요하다. " +
        "NEXT_PUBLIC_API_BASE_URL=http://localhost:<전용포트> npm test 로 실행하라. " +
        "주소를 생략하면 기본값 8080(조율자 시드 서버)으로 실제 요청이 나간다.",
    );
  }
  return host.replace(/\/+$/, "");
}

/** `${host}/api/v1` — `API_SPEC §1.1` 의 베이스 경로를 붙인 값. */
export function requireRealBackendApiBaseUrl(): string {
  return `${requireRealBackendHost()}/api/v1`;
}

/** `ws(s)://host/ws/location` — STOMP 접속 주소. */
export function requireRealBackendWsUrl(): string {
  const host = requireRealBackendHost();
  const scheme = host.startsWith("https://") ? "wss://" : "ws://";
  return `${scheme}${host.replace(/^https?:\/\//, "")}/ws/location`;
}
