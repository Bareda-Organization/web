import { lastLoginText } from "./lastLogin";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** `5시간 전` — 1분 미만은 방금, 그 위로 분 · 시간 · 일 단위로 내린다. 미래 시각(기기 시계 어긋남)은 방금으로 둔다. */
export const agoText = (raw: string, now: Date = new Date()): string => {
  const diff = now.getTime() - new Date(raw).getTime();
  if (!(diff >= MINUTE_MS)) return "방금";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}시간 전`;
  return `${Math.floor(diff / DAY_MS)}일 전`;
};

const spanText = (minutes: number): string => {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
};

/** 기준 시각이 지금보다 앞이면 `7분 지남`, 뒤면 `1시간 38분 뒤` — 1분 미만은 `방금 지남` · `곧`. */
export const untilText = (raw: string, now: Date = new Date()): string => {
  const diffMinutes = Math.floor(Math.abs(new Date(raw).getTime() - now.getTime()) / MINUTE_MS);
  const past = new Date(raw).getTime() <= now.getTime();
  if (diffMinutes < 1) return past ? "방금 지남" : "곧";
  return `${spanText(diffMinutes)} ${past ? "지남" : "뒤"}`;
};

const SEOUL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const SEOUL_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const SEOUL_MONTH_DAY_LONG = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

/** 표의 시각 칸 — 첫 줄 `오늘 07:41` · `어제 23:10` · `9월 13일 11:23`, 둘째 줄은 항상 `5시간 전`. */
export const eventTimeCell = (raw: string, now: Date = new Date()): { main: string; sub: string } => {
  const date = new Date(raw);
  const dayDiff = Math.round((Date.parse(SEOUL_DAY.format(now)) - Date.parse(SEOUL_DAY.format(date))) / DAY_MS);
  const main = dayDiff <= 1 ? lastLoginText(raw, now) : `${SEOUL_MONTH_DAY_LONG.format(date)} ${SEOUL_CLOCK.format(date)}`;
  return { main, sub: agoText(raw, now) };
};

// 학원 구분 색 — 같은 학원은 어느 화면에서도 같은 색이다. 색은 두 가지(시안의 학원 구분 2색)라 이름에서 한 비트를 뽑아 정한다(이름이 같으면 항상 같은 색).
// 학원 목록의 순서나 id 에 기대지 않는 이유 — 이름만 주는 응답(차단 계정 · 감사 로그)에서도 같은 규칙으로 색을 낼 수 있어야 한다.
// ponytail: 두 색뿐이라 서로 다른 두 학원이 같은 색일 수 있다 — 이름 옆에 항상 글자가 있어 색만으로 구별하지 않는다.
export const academySlot = (academyName: string): 0 | 1 => {
  let hash = 0;
  for (const char of academyName) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
  return ((hash >>> 3) & 1) as 0 | 1;
};

export const academyDotColor = (academyName: string): string => (academySlot(academyName) === 0 ? "var(--c-a1)" : "var(--c-a2)");
