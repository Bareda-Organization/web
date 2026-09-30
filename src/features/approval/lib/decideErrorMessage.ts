import { ApiError } from "@/shared/lib/http";

// §5.6 구간 변경 결정이 서버에서 거절되는 세 갈래 — 화면이 예전 상태라서 생긴 거절이므로, 알린 뒤 상세를 다시 불러와
// 승인·거절 버튼이 최신 상태(이미 결정됨)를 따르게 한다. 서버 문구를 그대로 내면 사유가 안 드러나 코드별 한국어로 바꾼다.
const STALE_DECISION_MESSAGE: Record<string, string> = {
  APPROVAL_ALREADY_DECIDED: "이미 다른 관계자가 처리한 요청입니다 — 최신 상태로 새로 불러옵니다",
  CHANGE_WINDOW_CLOSED: "처리할 수 있는 시간이 지났습니다 — 기한이 지나 자동 거절됐거나 운행이 시작됐습니다",
  STUDENT_NOT_IN_RUN: "이 학생은 더 이상 해당 회차의 명단에 없습니다 — 최신 상태로 새로 불러옵니다",
};

export type DecideFailure = {
  message: string;
  /** true 면 화면이 예전 상태이므로 상세를 다시 불러온다. */
  shouldReload: boolean;
};

export const toDecideFailure = (cause: unknown, fallback: string): DecideFailure => {
  if (!(cause instanceof ApiError)) return { message: fallback, shouldReload: false };
  const staleMessage = STALE_DECISION_MESSAGE[cause.code];
  if (staleMessage) return { message: staleMessage, shouldReload: true };
  // 409 PREVIEW_STALE — 조회 시점 재최적화가 낡았다는 뜻이라 새 미리보기를 받아 오는 것이 유일한 복구 경로다(§5.6).
  return { message: cause.message, shouldReload: cause.code === "PREVIEW_STALE" };
};
