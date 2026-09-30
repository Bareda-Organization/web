import { ApiError } from "@/shared/lib/http";

export type WeekdayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAY_OPTIONS: { value: WeekdayCode; label: string }[] = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
];

export const WEEKDAY_LABEL: Record<WeekdayCode, string> = Object.fromEntries(
  WEEKDAY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<WeekdayCode, string>;

// failure 가 null 이면 그 요일은 만들어졌다. result 는 action 이 돌려준 값(실패하면 undefined).
export type WeekdayOutcome<T> = { weekday: WeekdayCode; failure: string | null; result: T | undefined };

const describeApiError = (cause: unknown) => (cause instanceof ApiError ? cause.message : "저장에 실패했습니다");

/**
 * B1 #7 — 요일마다 기존 등록 API 를 한 번씩 부른다(서버에 일괄 API 를 두지 않는다 — Ruling 490).
 * 한 요일이 실패해도 멈추지 않고 나머지를 이어 간다. 그래서 "전부 성공 또는 전부 취소" 가 아니라
 * 요일별 결과가 돌아오고, 화면은 실패한 요일만 사유와 함께 보여 준다. 순서를 지키려고 차례로 부른다.
 */
export const runPerWeekday = async <T>(
  weekdays: WeekdayCode[],
  action: (weekday: WeekdayCode) => Promise<T>,
  describeFailure: (cause: unknown) => string = describeApiError,
): Promise<WeekdayOutcome<T>[]> => {
  const outcomes: WeekdayOutcome<T>[] = [];
  for (const weekday of weekdays) {
    try {
      outcomes.push({ weekday, failure: null, result: await action(weekday) });
    } catch (cause) {
      outcomes.push({ weekday, failure: describeFailure(cause), result: undefined });
    }
  }
  return outcomes;
};
