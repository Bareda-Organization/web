// 감사 · 접속 이력(§6.13) 화면이 서버 값을 사람 말로 바꾸는 순수 함수.
const DETAIL_ACTION_LABEL: Record<string, string> = {
  "run.force_confirm": "강제 확정",
  "run.force_finish": "강제 종료",
};

/** 감사 행의 `detail.action`(§6.14 · §6.17 — 강제 확정 · 강제 종료)을 한글로. 없으면 null, 사전에 없는 값은 원문. */
export const detailActionLabel = (detailAction: string | null | undefined): string | null => {
  if (!detailAction) return null;
  return DETAIL_ACTION_LABEL[detailAction] ?? detailAction;
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  student: "학생",
  run: "회차",
  run_roster: "회차 명단",
  roster: "회차 명단",
  route: "노선",
  bus: "차량",
  manager: "매니저",
  staff: "관계자",
  account: "계정",
  academy: "학원",
  guardian: "보호자",
  notification: "알림",
};

/** `학생 #39` · `회차 #66 (강제 확정)` — 대상 종류를 한글로, 동작이 구별되는 행은 괄호로 덧붙인다. */
export const targetText = (targetType: string, targetId: string, detailAction: string | null | undefined): string => {
  const base = `${TARGET_TYPE_LABEL[targetType] ?? targetType} #${targetId}`;
  const action = detailActionLabel(detailAction);
  return action ? `${base} (${action})` : base;
};

const SEOUL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const SEOUL_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const SEOUL_MONTH_DAY = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

/** 표의 시각 — 오늘이면 `오늘 12:41`, 아니면 `9/12 17:00`(서울 기준 · 초와 ISO 원문은 보이지 않는다). */
export const stampText = (raw: string, now: Date = new Date()): string => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  const clock = SEOUL_CLOCK.format(date);
  if (SEOUL_DAY.format(date) === SEOUL_DAY.format(now)) return `오늘 ${clock}`;
  return `${SEOUL_MONTH_DAY.format(date).replace(/\.\s*/g, "/").replace(/\/$/, "")} ${clock}`;
};
