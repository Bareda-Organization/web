"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { useProtectedImageUrl } from "@/shared/hooks";
import { AlertBanner, BoardingStatusChip, Button, Dialog } from "@/shared/ui";
import { getRunRoster } from "../api";
import type { RunRosterResponseTypes } from "../types";
import {
  StyledRosterAvatar,
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

/** 학생 사진(O-06) — 로그인 토큰으로 받아 그린다. 주소가 없거나 받지 못했거나 이미지가 깨지면 이름 첫 글자. */
const StudentAvatar = ({ name, photoUrl }: { name: string; photoUrl: string | null }) => {
  const src = useProtectedImageUrl(photoUrl);
  const [brokenSrc, setBrokenSrc] = useState<string | undefined>(undefined);
  if (src && src !== brokenSrc) {
    return (
      <StyledRosterAvatar>
        <Image src={src} alt={`${name} 사진`} width={28} height={28} unoptimized onError={() => setBrokenSrc(src)} />
      </StyledRosterAvatar>
    );
  }
  return <StyledRosterAvatar aria-hidden="true">{name.slice(0, 1)}</StyledRosterAvatar>;
};

// §6.9 GET /admin/runs/{runId}/roster. 관리자는 마스킹 없는 연락처를 그대로 본다(§1.12) —
// 관계자 화면과 달리 이 화면은 "학원을 넘나드는 조회" 라 노출 범위를 넓힐 근거가 다르다.
// R48 시안: 승하차지별 묶음 · 학생 사진 · 학생 / 학부모 연락처 열(보호자가 없으면 –). 상태 막대와 건수는 Ruling 844 로 뺐다.
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

  const hasStudents = roster?.stops.some((stop) => stop.students.length > 0) ?? false;

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
        {roster && hasStudents ? (
          <>
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
                        <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
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
            <StyledRosterNote>연락처는 마스킹 없이 표시됩니다(메인 관리자 · 관제 목적). 사진이 없거나 불러오지 못한 학생은 이름 첫 글자로 대신합니다.</StyledRosterNote>
          </>
        ) : null}
      </StyledRosterDialogScroll>
    </Dialog>
  );
};
