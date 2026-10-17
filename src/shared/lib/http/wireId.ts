// 서버 id 는 JSON 숫자로 온다 — 화면 타입은 문자열이라 `asIdString` 으로 바꿀 필드(K)만 `string | number` 로 받는다.
export type WithId<T, K extends keyof T> = Omit<T, K> & { [P in K]: string | number };
