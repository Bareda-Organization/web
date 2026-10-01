import { ApiError } from "@/shared/lib/http";

// 스케줄 저장·복사가 실패한 사유를 화면 문구로 — 이 화면만의 전용 문구가 있는 409 둘을 먼저 가른다.
export const describeScheduleFailure = (cause: unknown) => {
  if (cause instanceof ApiError && cause.code === "DUPLICATE_SCHEDULE") {
    return "같은 차량·요일·방향·출발 시각의 스케줄이 이미 있습니다.";
  }
  if (cause instanceof ApiError && cause.code === "DUPLICATE_RUN") {
    // Ruling 367 — 옮길 자리를 다른 회차가 잡고 있으면 스케줄 변경 전체가 되돌려진다.
    return "다른 회차(임시 회차 등)가 이미 그 자리를 차지해 스케줄 변경 전체가 반영되지 않았습니다.";
  }
  return cause instanceof ApiError ? cause.message : "스케줄 저장에 실패했습니다";
};
