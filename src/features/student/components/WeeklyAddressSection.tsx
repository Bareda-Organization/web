"use client";

import { useEffect, useState } from "react";
import { WEEKDAY_LABEL, WEEKDAY_OPTIONS } from "@/shared/lib/format/weekdayBatch";
import { ApiError } from "@/shared/lib/http";
import { getStudentWeeklyAddresses } from "../api";
import type { StudentWeeklyAddressTypes } from "../types";
import {
  StyledGuardianEmpty,
  StyledGuardianSection,
  StyledGuardianTitle,
  StyledWeekdayLabel,
  StyledWeeklyAddressList,
} from "./StudentForm.styled";

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;

const formatAddress = (entry: StudentWeeklyAddressTypes) =>
  entry.addressDetail ? `${entry.address} (${entry.addressDetail})` : entry.address;

// STU-06 — 학생의 요일별 승하차 주소. 입력은 학부모 몫이라(P-05) 편집 칸 없이 읽기만 한다. 조회는 서버가 감사 기록으로 남긴다.
// 조회가 실패해도 학생 수정 폼을 막지 않는다 — 이 구역에만 사유를 보인다.
export const WeeklyAddressSection = ({ studentId }: { studentId: string }) => {
  const [entries, setEntries] = useState<StudentWeeklyAddressTypes[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudentWeeklyAddresses(studentId)
      .then(setEntries)
      .catch((cause: unknown) =>
        setError(`승하차 주소를 불러오지 못했습니다${cause instanceof ApiError ? ` — ${cause.message}` : ""}`),
      );
  }, [studentId]);

  const orderedEntries = (entries ?? []).toSorted(
    (a, b) =>
      WEEKDAY_OPTIONS.findIndex((option) => option.value === a.weekday) -
        WEEKDAY_OPTIONS.findIndex((option) => option.value === b.weekday) ||
      (a.direction === b.direction ? 0 : a.direction === "to_academy" ? -1 : 1),
  );

  return (
    <StyledGuardianSection>
      <StyledGuardianTitle>요일별 승하차 주소 (학부모가 등록 · 조회 전용)</StyledGuardianTitle>
      {error ? <StyledGuardianEmpty role="alert">{error}</StyledGuardianEmpty> : null}
      {entries !== null && entries.length === 0 ? (
        <StyledGuardianEmpty>학부모가 아직 등록하지 않았습니다.</StyledGuardianEmpty>
      ) : null}
      {orderedEntries.length > 0 ? (
        <StyledWeeklyAddressList>
          {orderedEntries.map((entry) => (
            <li key={`${entry.weekday}-${entry.direction}`}>
              <StyledWeekdayLabel>{WEEKDAY_LABEL[entry.weekday]}</StyledWeekdayLabel> {DIRECTION_LABEL[entry.direction]}{" "}
              <span>{formatAddress(entry)}</span>
            </li>
          ))}
        </StyledWeeklyAddressList>
      ) : null}
    </StyledGuardianSection>
  );
};
