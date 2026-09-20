// STOMP 구독 목적지 빌더 — `API_SPEC §7` 채널 표 중 이 앱이 실제로 쓰는 2개만.
//
// `baraeda_core`(Dart) 의 `WsChannel` 은 4개(studentRun · managerRun · academyLive ·
// adminLive) 를 전부 갖는다 — 학부모·학생 앱과 매니저 앱이 그 나머지 2개를 쓰기
// 때문이다. `academy-web` 은 관계자(학원 채널)와 메인 관리자(관리자 채널)만
// 존재하는 역할이라(BRIEF-W.md §2, `docs/API_SPEC.md §7`) 여기 없는 2개를 만들면
// 이 앱 안에서 아무도 호출하지 않는 죽은 코드가 된다 — 판단 근거, 보고서 §1.
//
// Dart 쪽은 `WsChannel` 이라는 이름 없는 생성자 클래스로 4개를 정적 메서드로
// 묶었지만, `CONVENTIONS_REACT.md` "PascalCase 는 React 컴포넌트와 도메인 요소(폴더)에만"
// 규칙상 값 바인딩에 PascalCase 를 쓸 수 없다 — TS 는 네임스페이스 클래스가
// 관용적이지도 않으므로 그냥 함수 2개로 둔다.
export const academyLiveDestination = (academyId: string): string => `/topic/academy/${academyId}/live`;

export const adminLiveDestination = (): string => "/topic/admin/live";
