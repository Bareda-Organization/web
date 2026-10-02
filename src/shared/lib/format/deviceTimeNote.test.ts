import { describe, expect, it } from "vitest";
import { deviceTimeNote } from "./deviceTimeNote";

// 비상 목록의 "발생 시각" 은 서버 접수 시각이다. 단말이 누른 시각(occurred_at)은 오프라인 큐로 늦게 도착한 비상에서만 벌어지므로
// 1분을 넘게 다를 때만 참고로 덧붙인다(R47 Ruling 744 · Ruling 616).
const RAISED = "2026-09-12T08:10:00+09:00";

describe("deviceTimeNote — 단말 기록 시각 병기", () => {
  it("59초 차이는 병기하지 않는다", () => {
    expect(deviceTimeNote(RAISED, "2026-09-12T08:09:01+09:00")).toBeNull();
  });

  it("정확히 60초도 병기하지 않는다 — 1분을 넘어야 한다", () => {
    expect(deviceTimeNote(RAISED, "2026-09-12T08:09:00+09:00")).toBeNull();
  });

  it("61초 차이는 병기한다", () => {
    expect(deviceTimeNote(RAISED, "2026-09-12T08:08:59+09:00")).toBe("단말 기록 08:08(참고)");
  });

  it("단말 시계가 앞서 있어도(접수 시각보다 늦은 값) 1분을 넘게 다르면 병기한다", () => {
    expect(deviceTimeNote(RAISED, "2026-09-12T08:11:01+09:00")).toBe("단말 기록 08:11(참고)");
  });

  it("값이 없거나 읽을 수 없으면 병기하지 않는다", () => {
    expect(deviceTimeNote(RAISED, null)).toBeNull();
    expect(deviceTimeNote(RAISED, undefined)).toBeNull();
    expect(deviceTimeNote(RAISED, "읽을 수 없음")).toBeNull();
  });

  it("시각은 서울 기준이다 — UTC 표기로 와도 같다", () => {
    // 2026-09-11T23:10:00Z = 서울 08:10, 22:50Z = 서울 07:50
    expect(deviceTimeNote("2026-09-11T23:10:00Z", "2026-09-11T22:50:00Z")).toBe("단말 기록 07:50(참고)");
  });
});
