// "최근 로그인 오늘 12:21" — 오늘 · 어제는 말로, 그 밖은 월/일. 서울 기준이고 값이 없으면 로그인한 적이 없는 것이다(§6.3 · §6.4 · §6.6 last_login_at).
const SEOUL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const SEOUL_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const SEOUL_MONTH_DAY = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

const DAY_MS = 86_400_000;

export const lastLoginText = (raw: string | null | undefined, now: Date = new Date()): string => {
  if (!raw) return "로그인 이력 없음";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "로그인 이력 없음";
  const clock = SEOUL_CLOCK.format(date);
  const day = SEOUL_DAY.format(date);
  if (day === SEOUL_DAY.format(now)) return `오늘 ${clock}`;
  if (day === SEOUL_DAY.format(new Date(now.getTime() - DAY_MS))) return `어제 ${clock}`;
  return `${SEOUL_MONTH_DAY.format(date).replace(/\.\s*/g, "/").replace(/\/$/, "")} ${clock}`;
};

const SEOUL_MONTH_DAY_LONG = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

// 서울 날짜 문자열(YYYY-MM-DD) 둘 사이의 일수 — 시각이 아니라 날짜로 센다(자정 직전·직후가 하루 차이로 읽히게).
const dayDiff = (later: string, earlier: string): number => Math.round((Date.parse(later) - Date.parse(earlier)) / DAY_MS);

/** 계정 목록의 최근 로그인 칸 — `오늘 12:21` 한 줄, 더 오래되면 `9월 13일 11:23` + `20일 전`. */
export const lastLoginCell = (raw: string | null | undefined, now: Date = new Date()): { main: string; sub?: string } => {
  if (!raw) return { main: "기록 없음" };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { main: "기록 없음" };
  const diff = dayDiff(SEOUL_DAY.format(now), SEOUL_DAY.format(date));
  if (diff <= 1) return { main: lastLoginText(raw, now) };
  return { main: `${SEOUL_MONTH_DAY_LONG.format(date)} ${SEOUL_CLOCK.format(date)}`, sub: `${diff}일 전` };
};
