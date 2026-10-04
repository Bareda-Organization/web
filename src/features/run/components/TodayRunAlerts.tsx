"use client";

import { AlertBanner, Button } from "@/shared/ui";
import { PhoneLink } from "./PhoneLink";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import type { DashboardRunResponseTypes, RosterItemResponseTypes } from "../types";
import { formatCountdown, formatMinutesLeft } from "../lib/useNow";

type Props = {
  run: DashboardRunResponseTypes;
  roster: RosterItemResponseTypes[];
  nowMs: number;
  onShowNoShow: () => void;
  onOpenAssignment: () => void;
};

// 확정(출발 30분 전) 시각 — FEATURE_SPEC C-03.
const CONFIRM_LEAD_MS = 30 * 60_000;

const contactSummary = (attempts: number, last: "answered" | "no_answer" | null): string =>
  attempts === 0 ? "보호자 전화 시도 없음" : `보호자 전화 시도 ${attempts}회${last === "no_answer" ? "(무응답)" : last === "answered" ? "(통화됨)" : ""}`;

// 그 회차에서 지금 가장 급한 일을 한 띠로 — 운행 중이면 미승차 에스컬레이션(카운트다운 · 보호자 전화), 확정 전이면 기사 미배치.
// 조치 대상이 명단 맨 아래에 묻히지 않게 한다(사양 C-02 · EXC-01 의 3분 에스컬레이션을 이 화면이 드러낸다).
export const TodayRunAlerts = ({ run, roster, nowMs, onShowNoShow, onOpenAssignment }: Props) => {
  if (run.noShowCases.length > 0) {
    const cases = run.noShowCases;
    const first = cases[0];
    const attempts = Math.max(...cases.map((c) => c.callAttempts));
    const nearest = Math.min(...cases.map((c) => Date.parse(c.expiresAt)));
    const countdown = formatCountdown(nearest, nowMs);
    return (
      <AlertBanner
        tone="missed"
        title={`미승차 ${cases.length}명 · ${first.stopName}`}
        action={
          <>
            {cases.map((c) => {
              // 보호자 전화는 명단 행의 번호를 쓴다(미승차 케이스 응답에는 이름만 있다).
              const phone = roster.find((item) => item.name === c.studentName && item.status === "no_show")?.guardianPhone ?? null;
              return phone ? (
                <PhoneLink key={c.studentName} phone={phone} label={`${c.studentName} 보호자`} />
              ) : (
                <Button key={c.studentName} size="sm" variant="secondary" icon="phone" disabled title="보호자 연락처가 없습니다">
                  {c.studentName} 보호자
                </Button>
              );
            })}
            <Button size="sm" variant="ghost" onClick={onShowNoShow}>
              명단 보기
            </Button>
          </>
        }
      >
        {cases.map((c) => c.studentName).join(" · ")} — 학부모에게 알림 전송 · {contactSummary(attempts, first.lastContactResult)} ·{" "}
        {countdown ? (
          <>
            3분 카운트다운 <b>{countdown}</b> 남음. 만료되면 관계자 판단으로 출발합니다.
          </>
        ) : (
          "카운트다운이 끝났습니다. 관계자 판단으로 출발합니다."
        )}
      </AlertBanner>
    );
  }

  if ((run.runStatus === "idle" || run.runStatus === "confirmed") && (run.driverName === null || run.escortName === null)) {
    const confirmAt = Date.parse(run.departTime) - CONFIRM_LEAD_MS;
    const left = formatMinutesLeft(confirmAt, nowMs);
    const missing = run.driverName === null ? "기사" : "동승 매니저";
    const other = run.driverName === null ? run.escortName : null;
    return (
      <AlertBanner
        tone="moving"
        title={`${missing}가 배치되지 않았습니다${Number.isFinite(confirmAt) ? ` — ${formatClockTime(new Date(confirmAt).toISOString())} 확정 전에 배치해야 합니다` : ""}`}
        action={
          <Button size="sm" variant="secondary" onClick={onOpenAssignment}>
            매니저 배치 변경
          </Button>
        }
      >
        {left ? `확정까지 ${left}` : "확정 시각이 지났습니다"}
        {other && !run.ackEscort ? ` · 동승 매니저 ${other}도 아직 변경 내용을 확인하지 않았습니다.` : ""}
      </AlertBanner>
    );
  }
  return null;
};
