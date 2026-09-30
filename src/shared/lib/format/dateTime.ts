// 시간대(`Z`·`+09:00`)가 붙어 있는지 — 없으면 서버가 이미 한국 시간으로 준 값이다.
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;
// 날짜 없이 시각만 온 값("08:02" · "08:02:30") — 그대로 시:분만 보여 준다.
const TIME_ONLY = /^(\d{2}:\d{2})(:\d{2})?$/;
const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/;

const SEOUL_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// R32-W9 — 목록·상세에서 사람에게 보이는 "날짜 + 시각" 은 전부 이 함수 하나를 거친다(`2026-09-30 09:07`).
// 표시 시간대는 브라우저 설정과 무관하게 한국 시간이고, 초·소수점·ISO 의 `T`·`Z` 는 보이지 않는다.
// 값이 없거나 읽을 수 없으면 원문을 내지 않고 `-` 로 보여 준다. (시각만 필요한 곳은 `clockTime.ts`)
export const formatDateTime = (raw: string | null | undefined): string => {
  if (!raw) return "-";
  const timeOnly = TIME_ONLY.exec(raw);
  if (timeOnly) return timeOnly[1];
  if (!HAS_OFFSET.test(raw)) {
    const local = LOCAL_DATE_TIME.exec(raw);
    return local ? `${local[1]} ${local[2]}` : "-";
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";
  const parts = Object.fromEntries(SEOUL_PARTS.formatToParts(parsed).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

const SEOUL_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

// 서비스 기준 날짜(ERD §2)로 본 오늘 — `YYYY-MM-DD`. `new Date().toISOString().slice(0, 10)` 은 UTC 날짜라
// 한국 시간 00:00~09:00 에 어제를 낸다(등원 회차가 몰린 시간대). 날짜 입력칸의 기본값은 전부 이 함수를 거친다.
export const todayInSeoul = (): string => SEOUL_DATE.format(new Date());
