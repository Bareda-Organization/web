"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, BoardingStatusChip, Button, Dialog } from "@/shared/ui";
import { getRunRoster } from "../api";
import type { RosterBoardStatus, RunRosterResponseTypes } from "../types";
import {
  StyledRosterAvatar,
  StyledRosterBar,
  StyledRosterCounts,
  StyledRosterDialogScroll,
  StyledRosterGroupRow,
  StyledRosterNote,
  StyledRosterTable,
} from "./MonitoringPage.styled";

type RunRosterDialogProps = {
  runId: string;
  busNo: string;
  /** `등원` · `하원` — 제목에 붙는다(없으면 호차만) */
  direction?: string;
  onClose: () => void;
};

const COUNT_ORDER: { key: "done" | "no_show" | "absent" | "waiting"; label: string; color: string }[] = [
  { key: "done", label: "탑승 완료", color: "var(--c-conf)" },
  { key: "no_show", label: "미승차", color: "var(--c-bad)" },
  { key: "absent", label: "미등원", color: "var(--c-end)" },
  { key: "waiting", label: "대기", color: "var(--surface-fill)" },
];

// 탑승 완료 = 탑승한 학생 + 이미 내린 학생(둘 다 정상 진행). 나머지는 서버 값 그대로 센다.
const bucketOf = (status: RosterBoardStatus): "done" | "no_show" | "absent" | "waiting" =>
  status === "boarded" || status === "alighted" ? "done" : status === "no_show" ? "no_show" : status === "absent" ? "absent" : "waiting";

// §6.9 GET /admin/runs/{runId}/roster. 관리자는 마스킹 없는 연락처를 그대로 본다(§1.12) —
// 관계자 화면과 달리 이 화면은 "학원을 넘나드는 조회" 라 노출 범위를 넓힐 근거가 다르다.
// R48 시안: 맨 위 상태 막대 + 건수 · 승하차지별 묶음 · 학생 / 학부모 연락처 열(보호자가 없으면 –).
export const RunRosterDialog = ({ runId, busNo, direction, onClose }: RunRosterDialogProps) => {
  const [roster, setRoster] = useState<RunRosterResponseTypes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRunRoster(runId);
        if (!cancelled) {
          setRoster(data);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof ApiError ? cause.message : "명단을 불러오지 못했습니다");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const students = roster?.stops.flatMap((stop) => stop.students) ?? [];
  const counts = { done: 0, no_show: 0, absent: 0, waiting: 0 };
  for (const student of students) counts[bucketOf(student.status)] += 1;

  return (
    <Dialog
      title={`${busNo}${direction ? ` · ${direction}` : ""} 탑승 명단`}
      showClose
      width={720}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
      }
    >
      <StyledRosterDialogScroll role="region" aria-label="탑승 명단" tabIndex={0}>
        {error ? <AlertBanner tone="missed" title={error} /> : null}
        {loading ? <p>불러오는 중...</p> : null}
        {!loading && roster && roster.stops.length === 0 ? <p>등록된 승하차지가 없습니다</p> : null}
        {roster && students.length > 0 ? (
          <>
            <StyledRosterBar role="img" aria-label={COUNT_ORDER.map((item) => `${item.label} ${counts[item.key]}`).join(" · ")}>
              {COUNT_ORDER.filter((item) => counts[item.key] > 0).map((item) => (
                <i key={item.key} style={{ flex: counts[item.key], background: item.color }} />
              ))}
            </StyledRosterBar>
            <StyledRosterCounts>
              {COUNT_ORDER.map((item) => `${item.label} ${counts[item.key]}`).join(" · ")} · {students.length}명
            </StyledRosterCounts>
            <StyledRosterTable>
              <thead>
                <tr>
                  <th>학생</th>
                  <th>학생 연락처</th>
                  <th>학부모 연락처</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {roster.stops.flatMap((stop) => [
                  <StyledRosterGroupRow key={`stop-${stop.stopId}`}>
                    <td colSpan={4}>
                      {stop.name} · {stop.students.length}명
                    </td>
                  </StyledRosterGroupRow>,
                  ...stop.students.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <StyledRosterAvatar aria-hidden="true">{student.name.slice(0, 1)}</StyledRosterAvatar>
                        <b>{student.name}</b>
                      </td>
                      <td>{student.studentPhone ?? "–"}</td>
                      <td>{student.guardianPhone ?? "–"}</td>
                      <td>
                        <BoardingStatusChip status={student.status} />
                      </td>
                    </tr>
                  )),
                ])}
              </tbody>
            </StyledRosterTable>
            <StyledRosterNote>연락처는 마스킹 없이 표시됩니다(메인 관리자 · 관제 목적). 사진이 없는 학생은 이름 첫 글자로 대신합니다.</StyledRosterNote>
          </>
        ) : null}
      </StyledRosterDialogScroll>
    </Dialog>
  );
};
