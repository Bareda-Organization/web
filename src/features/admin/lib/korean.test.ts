import { describe, expect, it } from "vitest";
import { withObject } from "./korean";

describe("withObject — 받침에 따른 목적격 조사", () => {
  it("받침이 있으면 을, 없으면 를", () => {
    expect(withObject("이수민")).toBe("이수민을");
    expect(withObject("새봄영어")).toBe("새봄영어를");
    expect(withObject("하늘수학학원 부천중동점")).toBe("하늘수학학원 부천중동점을");
  });

  it("한글이 아닌 끝글자는 를", () => {
    expect(withObject("A1")).toBe("A1를");
  });
});
