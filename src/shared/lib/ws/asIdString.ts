// WebSocket 봉투·payload 의 식별자 흡수 — `frontend/packages/baraeda_core`(Dart, F4-A
// CORE 단계) 의 `id/as_id_string.dart` 와 같은 문제를 웹에서 풀기 위한 대응물이다.
// 그쪽을 그대로 import 할 수 없는 이유는 Flutter 패키지라서다(웹 번들에 못 들어간다) —
// 로직 자체(`value.toString()`)가 한 줄이라 포트하는 데는 문제가 없다.
//
// `API_SPEC.md §7` 공통 봉투는 `run_id` 를 `string` 으로 문서화하지만, 실제 서버
// `WebSocketEnvelope.java` 는 `Long runId` 를 그대로 내보낸다(Ruling 275, 위반
// 15건 · `String`/`Long` 두 관례 공존). `payload` 안의 `student_id` · `emergency_id` ·
// `rider_id` 등도 같은 사정이다. 여기서 직접 `as string`/`Number` 캐스팅을 쓰면
// 서버가 어느 쪽 관례를 택하든 절반은 깨진다 — 이 함수를 거쳐서만 식별자를 읽는다.
//
// ⚠ JS `number` 는 `Number.MAX_SAFE_INTEGER`(2^53-1) 를 넘는 Java `Long` 값을
// 손실 없이 담지 못한다(Dart 의 64비트 `int` 에는 없는 제약). `JSON.parse` 가 이미
// 그 값을 `number` 로 반올림한 뒤에 이 함수를 통과하므로, 이 함수 자체는 그 손실을
// 막지 못하고 "이미 손실된 값을 문자열로 바꿀 뿐"이다 — 현재 이 저장소의 ID 채번
// 범위(자동증가, 수백만 단위)에서는 실무상 문제가 되지 않는다(보고서 §2 참고).
export const asIdString = (value: unknown): string => String(value);
