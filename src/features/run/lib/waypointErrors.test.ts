import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { describeWaypointFailure } from "./waypointErrors";

const fail = (status: number, code: string) => describeWaypointFailure(new ApiError(status, code, "서버 원문"));

// §5.15 오류 코드마다 관계자 웹 문구 — 서버 원문 · 영문 코드는 화면에 내지 않는다.
describe("describeWaypointFailure", () => {
  it.each([
    ["CHANGE_WINDOW_CLOSED", 403, "마감"],
    ["RUN_CANCELED", 409, "취소"],
    ["PREVIEW_STALE", 409, "다시 미리보기"],
    ["ADDRESS_VERIFICATION_FAILED", 422, "주소"],
    ["RUN_NOT_FOUND", 404, "찾을 수 없"],
    ["VALIDATION_FAILED", 422, "확인"],
    ["RUN_NOT_CONFIRMED", 409, "확정"],
    ["ROUTE_NOT_CONFIGURED_FOR_RUN", 422, "노선 편성"],
    ["WAYPOINT_NOT_FOUND", 404, "경유 지점"],
    ["MAP_ROUTE_UNAVAILABLE", 503, "잠시 뒤"],
  ])("%s 는 전용 문구를 쓴다", (code, status, fragment) => {
    const result = fail(status, code);
    expect(result.message).toContain(fragment);
    expect(result.message).not.toContain("서버 원문");
    expect(result.message).not.toContain(code);
  });

  it("마감·낡은 미리보기·경유 지점 부재는 안내 뒤 목록을 새로 고친다", () => {
    expect(fail(403, "CHANGE_WINDOW_CLOSED").reload).toBe(true);
    expect(fail(404, "WAYPOINT_NOT_FOUND").reload).toBe(true);
    expect(fail(409, "PREVIEW_STALE").reload).toBe(false);
    expect(fail(409, "PREVIEW_STALE").redoPreview).toBe(true);
  });

  it("알 수 없는 실패는 일반 문구", () => {
    expect(describeWaypointFailure(new Error("x")).message).toContain("잠시 뒤");
  });
});
