// 서비스 기준 날짜는 Asia/Seoul 이다(ERD §2). `toISOString()` 은 UTC 날짜라 한국 시간 00:00~09:00 에
// 전날을 낸다 — 등원 준비 시간대에 "오늘 회차" 화면이 어제를 보여 주게 된다. `en-CA` 는 `YYYY-MM-DD` 로 나온다.
const SEOUL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const seoulToday = (): string => SEOUL_DATE.format(new Date());
