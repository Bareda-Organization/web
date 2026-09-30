import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { toDecideFailure } from "./decideErrorMessage";

describe("toDecideFailure", () => {
  // N-01 — §5.6 임시 취소된 회차의 승인은 409 RUN_CANCELED(거절은 허용, Ruling 376). 서버 원문 대신 이유와 남은 길을 알린다.
  it("RUN_CANCELED 는 취소된 회차라 승인할 수 없고 거절은 할 수 있다고 알리며, 최신 상태를 다시 불러온다", () => {
    const failure = toDecideFailure(new ApiError(409, "RUN_CANCELED", "서버 원문"), "결정에 실패했습니다");

    expect(failure.message).toBe("임시 취소된 회차라 승인할 수 없습니다 — 거절만 할 수 있습니다");
    expect(failure.shouldReload).toBe(true);
  });
});
