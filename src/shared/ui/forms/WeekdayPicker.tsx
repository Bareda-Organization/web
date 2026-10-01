import { AlertBanner } from "../feedback/AlertBanner";
import { WEEKDAY_LABEL, WEEKDAY_OPTIONS } from "@/shared/lib/format/weekdayBatch";
import type { WeekdayCode, WeekdayOutcome } from "@/shared/lib/format/weekdayBatch";
import { Checkbox } from "./Checkbox";
import { StyledFailureList, StyledFieldset, StyledLegend, StyledWeekdayRow } from "./WeekdayPicker.styled";

export type WeekdayPickerProps = {
  label?: string;
  value: WeekdayCode[];
  onChange: (next: WeekdayCode[]) => void;
  /** 고를 수 없는 요일 — 복사 원본의 요일처럼 이미 있는 자리 */
  disabledWeekdays?: WeekdayCode[];
  /** 직전 저장의 요일별 결과 — 실패한 요일이 있으면 어느 요일이 왜 실패했는지 아래에 보인다 */
  outcomes?: WeekdayOutcome<unknown>[] | null;
};

/**
 * 요일 다중 선택 — 한 번 저장하면 고른 요일마다 1건씩 만들어지는 등록·복사 폼에 쓴다.
 * 순서는 월~일로 고정이라 선택 순서와 무관하다.
 */
export const WeekdayPicker = ({ label = "요일", value, onChange, disabledWeekdays = [], outcomes }: WeekdayPickerProps) => {
  const failures = (outcomes ?? []).filter((outcome) => outcome.failure !== null);
  const savedCount = (outcomes?.length ?? 0) - failures.length;

  const handleToggle = (weekday: WeekdayCode, checked: boolean) =>
    onChange(WEEKDAY_OPTIONS.map((option) => option.value).filter((code) => (code === weekday ? checked : value.includes(code))));

  return (
    <>
      <StyledFieldset>
        <StyledLegend>{label}</StyledLegend>
        <StyledWeekdayRow>
          {WEEKDAY_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={value.includes(option.value)}
              disabled={disabledWeekdays.includes(option.value)}
              onChange={(event) => handleToggle(option.value, event.target.checked)}
            />
          ))}
        </StyledWeekdayRow>
      </StyledFieldset>
      {failures.length > 0 ? (
        <AlertBanner tone="missed" title={`${savedCount}개 요일은 저장됐고 ${failures.length}개 요일은 저장하지 못했습니다`}>
          <StyledFailureList>
            {failures.map((outcome) => (
              <li key={outcome.weekday}>
                {WEEKDAY_LABEL[outcome.weekday]}요일 — {outcome.failure}
              </li>
            ))}
          </StyledFailureList>
          실패한 요일만 선택돼 있습니다. 다시 저장하면 그 요일만 다시 시도합니다.
        </AlertBanner>
      ) : null}
    </>
  );
};
