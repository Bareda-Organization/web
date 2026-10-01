import { afterEach, describe, expect, it } from "vitest";
import { formatClockTime, formatClockTimeWithSeconds } from "./clockTime";

describe("formatClockTime", () => {
  it("같은 분 안의 초·밀리초 차이는 결과에 영향을 주지 않는다(시:분까지만 남긴다)", () => {
    // 실행 환경의 로컬 시간대에 좌우되지 않도록 "특정 문자열과 같다" 대신 "초 차이가
    // 결과를 바꾸지 않는다"를 검사한다 — 문자열을 그대로 박으면 CI 의 로컬 시간대가
    // 달라질 때 시험이 깨진다.
    expect(formatClockTime("2026-09-19T12:55:41.464829Z")).toBe(formatClockTime("2026-09-19T12:55:00.000000Z"));
  });

  it("분이 다르면 결과도 다르다", () => {
    expect(formatClockTime("2026-09-19T12:55:00Z")).not.toBe(formatClockTime("2026-09-19T12:56:00Z"));
  });

  it("이미 짧은 시각 문자열이면(Date 파싱 실패) 원본을 그대로 돌려준다", () => {
    expect(formatClockTime("08:10")).toBe("08:10");
  });
});

// R21-B 목표 3 — 운행 시각(출발·도착)만 초까지 보여준다. `formatClockTime` 과 같은 파일에
// 두어 "이 화면은 분까지, 저 화면은 초까지"가 한눈에 비교되게 한다.
describe("formatClockTimeWithSeconds", () => {
  it("같은 초 안의 밀리초 차이는 결과에 영향을 주지 않는다(시:분:초까지 남긴다)", () => {
    expect(formatClockTimeWithSeconds("2026-09-19T12:55:41.464829Z")).toBe(
      formatClockTimeWithSeconds("2026-09-19T12:55:41.000000Z"),
    );
  });

  it("초가 다르면 결과도 다르다 — formatClockTime 은 이 차이를 구분하지 못한다", () => {
    expect(formatClockTimeWithSeconds("2026-09-19T12:55:41Z")).not.toBe(
      formatClockTimeWithSeconds("2026-09-19T12:55:42Z"),
    );
  });

  it("이미 짧은 시각 문자열이면(Date 파싱 실패) 원본을 그대로 돌려준다", () => {
    expect(formatClockTimeWithSeconds("08:10:00")).toBe("08:10:00");
  });
});

// F01-10·F04-06 — 브라우저(PC) 시간대가 서울이 아니어도 같은 순간은 같은 서울 시각으로 보여야 한다.
describe("서울 시간대 고정", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("PC 시간대가 UTC·미국 서부여도 같은 순간을 서울 시각(시:분·시:분:초)으로 낸다", () => {
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Seoul"]) {
      process.env.TZ = tz;
      expect(formatClockTime("2026-09-30T15:05:09Z")).toBe("00:05");
      expect(formatClockTimeWithSeconds("2026-09-30T15:05:09Z")).toBe("00:05:09");
    }
  });

  // R46-CIFIX — 오프셋이 없는 값은 `formatDateTime` 처럼 한국 시간으로 읽는다. 예전에는 PC 시간대로 읽어
  // GitHub Actions(UTC)에서 `08:00` 이 `17:00` 으로 나왔다.
  it("오프셋 없는 날짜시각은 PC 시간대와 무관하게 서울 벽시계 그대로 낸다", () => {
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Seoul"]) {
      process.env.TZ = tz;
      expect(formatClockTime("2026-09-15T08:00:00")).toBe("08:00");
      expect(formatClockTimeWithSeconds("2026-09-15T08:00:07.250")).toBe("08:00:07");
    }
  });
});
