import { describe, expect, it } from "vitest";
import { asIdString } from "./asIdString";

// Ruling 275 — 서버가 같은 식별자를 문맥에 따라 number 로도 string 으로도
// 보낸다. 이 흡수가 없으면 화면 코드가 `runId === envelope.runId` 를 그대로
// 비교하다 타입이 갈리는 순간(문자열 "12" vs 숫자 12) 조용히 항상 거짓이 된다.
describe("asIdString", () => {
  it("number 를 string 으로 바꾼다", () => {
    expect(asIdString(12)).toBe("12");
  });

  it("string 은 그대로 둔다", () => {
    expect(asIdString("12")).toBe("12");
  });

  it("null·undefined 도 문자열로 바꾼다 (호출부가 별도로 null 체크한다)", () => {
    expect(asIdString(null)).toBe("null");
    expect(asIdString(undefined)).toBe("undefined");
  });
});
