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

// 학원 구분 색 — 같은 학원은 어느 화면에서도 같은 색이다(이름 글자 합의 홀짝으로 두 색을 가른다).
export const academyDotColor = (academyName: string): string => {
  const sum = [...academyName].reduce((total, char) => total + char.charCodeAt(0), 0);
  return sum % 2 === 0 ? "var(--c-a1)" : "var(--c-a2)";
};
