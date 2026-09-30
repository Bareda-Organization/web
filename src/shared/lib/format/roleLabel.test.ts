import { describe, expect, it } from "vitest";
import { formatRole } from "./roleLabel";

describe("formatRole", () => {
  it("역할을 한글로 바꾸고, 모르는 값은 원문을 그대로 낸다", () => {
    expect(formatRole("parent")).toBe("학부모");
    expect(formatRole("escort")).toBe("동승자");
    expect(formatRole("robot")).toBe("robot");
  });
});
