// 시작한 지 얼마나 됐는가(신청 · 접수) — "12분 전" · "5시간 전" · "3일 전". 미래 시각(시계 어긋남)은 "방금".
export const formatElapsed = (requestedAt: string, nowMs: number): string => {
  const requested = Date.parse(requestedAt);
  if (!Number.isFinite(requested)) return "";
  const minutes = Math.floor((nowMs - requested) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};
