"use client";

import { AlertBanner, Checkbox, Input } from "@/shared/ui";
import type { WorkHours } from "../types";
import { StyledWorkHoursDash, StyledWorkHoursFoot, StyledWorkHoursHead, StyledWorkHoursNote, StyledWorkHoursRow, StyledWorkHoursTitle, StyledWorkHoursTitleRow, StyledWorkHoursWrap } from "./WorkHoursEditor.styled";

const DAYS: Array<{ key: keyof WorkHours; label: string }> = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
];

type WorkHoursEditorProps = {
  value: WorkHours;
  onChange: (next: WorkHours) => void;
  /** 제목 오른쪽 한 줄 — 이 값이 어디에 쓰이는지 */
  note?: string;
};

// 시작이 끝보다 늦거나 같은 구간이 하나라도 있는지 — "HH:mm" 문자열이라 사전순 비교가 시각 순서와 같다.
export const hasInvalidWorkHours = (value: WorkHours): boolean =>
  Object.values(value).some((ranges) => ranges?.some((range) => range.start >= range.end));

// §5.13 work_hours — 요일별 근무 시간대(§5.14 MGR-06 충돌 경고의 근거). 요일당 구간
// 하나만 다룬다 — 사양이 배열을 허용하지만 관계자 등록 화면에서 요일당 여러 구간을
// 나눠 넣는 실제 흐름이 없어(하루 두 근무는 드묾) 첫 구간만 편집하고 나머지는 보존한다.
// 요일을 끄면 그 요일의 구간이 전부 지워진다.
export const WorkHoursEditor = ({ value, onChange, note }: WorkHoursEditorProps) => {
  const setDay = (day: keyof WorkHours, enabled: boolean, start = "09:00", end = "18:00") => {
    const next = { ...value };
    if (enabled) {
      next[day] = [{ start, end }, ...(value[day]?.slice(1) ?? [])];
    } else {
      delete next[day];
    }
    onChange(next);
  };

  return (
    <StyledWorkHoursWrap>
      <StyledWorkHoursTitleRow>
        <StyledWorkHoursTitle>근무 시간</StyledWorkHoursTitle>
        {note ? <StyledWorkHoursNote>{note}</StyledWorkHoursNote> : null}
      </StyledWorkHoursTitleRow>
      <StyledWorkHoursHead aria-hidden="true">
        <span>요일</span>
        <span>출근</span>
        <span />
        <span>퇴근</span>
      </StyledWorkHoursHead>
      {hasInvalidWorkHours(value) ? <AlertBanner tone="missed" title="근무 시작이 끝보다 빨라야 합니다" /> : null}
      {DAYS.map(({ key, label }) => {
        const range = value[key]?.[0];
        const enabled = !!range;
        return (
          <StyledWorkHoursRow key={key}>
            <Checkbox
              label={label}
              checked={enabled}
              onChange={(event) => setDay(key, event.target.checked, range?.start, range?.end)}
            />
            <Input
              type="time"
              aria-label={`${label}요일 출근 시각`}
              disabled={!enabled}
              value={range?.start ?? ""}
              onChange={(event) => setDay(key, true, event.target.value, range?.end ?? "18:00")}
            />
            <StyledWorkHoursDash aria-hidden="true">–</StyledWorkHoursDash>
            <Input
              type="time"
              aria-label={`${label}요일 퇴근 시각`}
              disabled={!enabled}
              value={range?.end ?? ""}
              onChange={(event) => setDay(key, true, range?.start ?? "09:00", event.target.value)}
            />
          </StyledWorkHoursRow>
        );
      })}
      <StyledWorkHoursFoot>근무 시간 밖의 운행이나 같은 시각의 중복 배치는 회차 배치 때 경고로 알려 줍니다.</StyledWorkHoursFoot>
    </StyledWorkHoursWrap>
  );
};
