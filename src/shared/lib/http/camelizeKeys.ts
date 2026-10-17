// 서버 응답의 snake_case 키를 camelCase 로 바꾼다(`API_SPEC §1.1`) — 객체 키만 바꾸고 값은 건드리지 않으며, 배열 안 객체와 중첩 객체까지 내려간다.
// ⚠ 키가 데이터인 객체(상태 · id · 날짜를 키로 쓰는 맵)도 키를 바꾼다. 지금 응답에서 그런 맵의 키는 `idle` · `mon` 처럼 밑줄이 없어 그대로지만,
// 밑줄이 든 키를 쓰는 맵이 생기면 이 함수를 거치지 않게 호출부에서 따로 다뤄야 한다.
const toCamelKey = (key: string): string => key.replace(/_([a-z0-9])/g, (_match, next: string) => next.toUpperCase());

export const camelizeKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [toCamelKey(key), camelizeKeys(inner)]));
  }
  return value;
};
