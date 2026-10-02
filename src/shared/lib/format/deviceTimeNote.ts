import { formatClockTime } from "./clockTime";

// 접수 시각과 이 값(ms)을 넘게 벌어졌을 때만 단말 시각을 덧붙인다 — 정확히 1분은 덧붙이지 않는다.
const DEVICE_TIME_GAP_THRESHOLD_MS = 60_000;

// 비상 목록의 "발생 시각" 은 서버 접수 시각이다. 단말이 누른 시각(occurred_at)은 조작할 수 있어 정렬·판정에 쓰지 않는 참고값이고(R47 Ruling 744),
// 오프라인 큐로 늦게 도착한 비상(Ruling 616)처럼 두 시각이 1분 넘게 벌어졌을 때만 "단말 기록 HH:mm(참고)" 로 덧붙인다. 아니면 null.
export const deviceTimeNote = (raisedAt: string, occurredAt: string | null | undefined): string | null => {
  if (!occurredAt) return null;
  const gap = Math.abs(Date.parse(raisedAt) - Date.parse(occurredAt));
  if (!Number.isFinite(gap) || gap <= DEVICE_TIME_GAP_THRESHOLD_MS) return null;
  return `단말 기록 ${formatClockTime(occurredAt)}(참고)`;
};
