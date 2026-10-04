// 끝나지 않은 회차 화면의 날짜 계산 — 운행일(`YYYY-MM-DD`, §6.16 `service_date`)을 "9월 29일 (화)" 와 "4일째" 로 바꾼다. 서울 날짜 기준.
const SEOUL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_MS = 86_400_000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 운행일을 `9월 29일 (화)` 로, 며칠째인지(`운행일` = 1일째가 아니라 지난 날수)를 함께 돌려준다. */
export const serviceDateLabel = (serviceDate: string, now: Date = new Date()): { date: string; days: number } => {
  const [year, month, day] = serviceDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const days = Math.round((Date.parse(SEOUL_DAY.format(now)) - Date.UTC(year, month - 1, day)) / DAY_MS);
  return { date: `${month}월 ${day}일 (${weekday})`, days };
};
