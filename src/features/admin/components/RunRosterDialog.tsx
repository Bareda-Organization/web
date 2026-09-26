"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Dialog } from "@/shared/ui";
import { getRunRoster } from "../api";
import type { RosterBoardStatus, RunRosterResponseTypes } from "../types";
import { StyledRosterStopBlock, StyledRosterStopTitle, StyledRosterStudentRow } from "./MonitoringPage.styled";

type RunRosterDialogProps = {
  runId: string;
  busNo: string;
  onClose: () => void;
};

const BOARD_STATUS_LABEL: Record<RosterBoardStatus, string> = {
  boarded: "탑승 완료",
  alighted: "하차 완료",
  absent: "미등원",
  no_show: "미승차",
  waiting: "대기",
};

const BOARD_STATUS_TONE: Record<RosterBoardStatus, "neutral" | "added" | "amber" | "red"> = {
  boarded: "added",
  alighted: "added",
  absent: "neutral",
  no_show: "red",
  waiting: "amber",
};

// §6.9 GET /admin/runs/{runId}/roster. 관리자는 마스킹 없는 연락처를 그대로 본다(§1.12) —
// 관계자 화면과 달리 이 화면은 "학원을 넘나드는 조회" 라 노출 범위를 넓힐 근거가 다르다.
export const RunRosterDialog = ({ runId, busNo, onClose }: RunRosterDialogProps) => {
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

  return (
    <Dialog title={`${busNo} 탑승 명단`} onClose={onClose}>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {loading ? <p>불러오는 중...</p> : null}
      {!loading && roster && roster.stops.length === 0 ? <p>등록된 승하차지가 없습니다</p> : null}
      {roster?.stops.map((stop) => (
        <StyledRosterStopBlock key={stop.stopId}>
          <StyledRosterStopTitle>{stop.name}</StyledRosterStopTitle>
          {stop.students.map((student) => (
            <StyledRosterStudentRow key={student.studentId}>
              <span>{student.name}</span>
              <Badge tone={BOARD_STATUS_TONE[student.status]}>{BOARD_STATUS_LABEL[student.status]}</Badge>
            </StyledRosterStudentRow>
          ))}
        </StyledRosterStopBlock>
      ))}
    </Dialog>
  );
};
