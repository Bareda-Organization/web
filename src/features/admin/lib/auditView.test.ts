import { describe, expect, it } from "vitest";
import { detailActionLabel, stampText, targetText } from "./auditView";

describe("detailActionLabel — 감사 행 detail.action 문구(Ruling 809)", () => {
  it("강제 확정 · 강제 종료는 한글 문구, 없으면 null, 모르는 값은 원문", () => {
    expect(detailActionLabel("run.force_confirm")).toBe("강제 확정");
    expect(detailActionLabel("run.force_finish")).toBe("강제 종료");
    expect(detailActionLabel(null)).toBeNull();
    expect(detailActionLabel("run.something_new")).toBe("run.something_new");
  });
});

describe("targetText — 대상 한글 종류 + #id (+ 동작 문구)", () => {
  it("대상 종류를 한글로 바꾸고 id 앞에 #을 붙인다", () => {
    expect(targetText("student", "39", null)).toBe("학생 #39");
    expect(targetText("run", "66", "run.force_confirm")).toBe("회차 #66 (강제 확정)");
  });

  it("모르는 종류는 원문 그대로 둔다", () => {
    expect(targetText("mystery", "7", null)).toBe("mystery #7");
  });
});

describe("stampText — 오늘은 오늘 HH:mm, 그 밖은 M/D HH:mm", () => {
  const now = new Date("2026-10-03T12:45:00+09:00");
  it("서울 날짜로 가른다", () => {
    expect(stampText("2026-10-03T12:41:00+09:00", now)).toBe("오늘 12:41");
    expect(stampText("2026-09-12T08:00:00Z", now)).toBe("9/12 17:00");
  });
});
