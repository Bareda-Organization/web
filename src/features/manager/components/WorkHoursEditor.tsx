"use client";

import { Checkbox, Input } from "@/shared/ui";
import type { WorkHours } from "../types";
import { StyledWorkHoursRow, StyledWorkHoursWrap } from "./WorkHoursEditor.styled";

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
};

// §5.13 work_hours — 요일별 근무 시간대(§5.14 MGR-06 충돌 경고의 근거). 요일당 구간
// 하나만 다룬다 — 사양이 배열을 허용하지만 관계자 등록 화면에서 요일당 여러 구간을
// 나눠 넣는 실제 흐름이 없어(하루 두 근무는 드묾) 첫 구간만 편집하고 나머지는 보존한다.
export const WorkHoursEditor = ({ value, onChange }: WorkHoursEditorProps) => {
  const setDay = (day: keyof WorkHours, enabled: boolean, start = "09:00", end = "18:00") => {
    const next = { ...value };
    if (enabled) {
      next[day] = [{ start, end }];
    } else {
      delete next[day];
    }
    onChange(next);
  };

  return (
    <StyledWorkHoursWrap>
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
              disabled={!enabled}
              value={range?.start ?? ""}
              onChange={(event) => setDay(key, true, event.target.value, range?.end ?? "18:00")}
            />
            <Input
              type="time"
              disabled={!enabled}
              value={range?.end ?? ""}
              onChange={(event) => setDay(key, true, range?.start ?? "09:00", event.target.value)}
            />
          </StyledWorkHoursRow>
        );
      })}
    </StyledWorkHoursWrap>
  );
};
