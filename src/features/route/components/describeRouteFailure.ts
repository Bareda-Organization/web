import { ApiError } from "@/shared/lib/http";

export const DUPLICATE_ROUTE_MESSAGE = "같은 차량·요일·방향의 편성이 이미 있습니다.";

// 편성 저장·복사가 실패한 사유를 화면 문구로 — 409 DUPLICATE_ROUTE 만 이 화면의 전용 문구를 쓴다.
export const describeRouteFailure = (cause: unknown) =>
  cause instanceof ApiError && cause.code === "DUPLICATE_ROUTE"
    ? DUPLICATE_ROUTE_MESSAGE
    : cause instanceof ApiError
      ? cause.message
      : "편성 저장에 실패했습니다";
