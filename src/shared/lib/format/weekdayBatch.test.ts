import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { runPerWeekday } from "./weekdayBatch";

// B1 #7 — 요일마다 1건씩 만들 때 한 요일이 실패해도 나머지는 계속 만들고, 어느 요일이 왜 실패했는지 돌려준다.
describe("runPerWeekday", () => {
  it("요일 순서대로 실행하고 실패한 요일만 사유와 함께 돌려준다", async () => {
    const called: string[] = [];
    const outcomes = await runPerWeekday(["mon", "tue", "wed"], async (weekday) => {
      called.push(weekday);
      if (weekday === "tue") throw new ApiError(409, "DUPLICATE_ROUTE", "이미 있는 편성입니다");
      return `${weekday}-id`;
    });

    expect(called).toEqual(["mon", "tue", "wed"]);
    expect(outcomes).toEqual([
      { weekday: "mon", failure: null, result: "mon-id" },
      { weekday: "tue", failure: "이미 있는 편성입니다", result: undefined },
      { weekday: "wed", failure: null, result: "wed-id" },
    ]);
  });

  it("사유 문구를 호출부가 바꿀 수 있다", async () => {
    const outcomes = await runPerWeekday(
      ["fri"],
      async () => {
        throw new ApiError(409, "DUPLICATE_ROUTE", "x");
      },
      (cause) => (cause instanceof ApiError && cause.code === "DUPLICATE_ROUTE" ? "이미 있음" : "실패"),
    );

    expect(outcomes[0].failure).toBe("이미 있음");
  });
});
