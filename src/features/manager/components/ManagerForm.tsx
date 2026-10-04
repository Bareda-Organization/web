"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Drawer, Input, RunStatusChip, Select } from "@/shared/ui";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { createManager, updateManager } from "../api";
import type { ManagerAssignmentTypes, ManagerItemResponseTypes, ManagerRole, WorkHours } from "../types";
import { assignmentsOn, formatMonthDay, nextDay } from "../lib/managerBoard";
import { hasInvalidWorkHours, WorkHoursEditor } from "./WorkHoursEditor";
import {
  StyledAssignDay,
  StyledAssignItem,
  StyledAssignRow,
  StyledAssignSection,
  StyledFormStack,
  StyledPanelFooter,
  StyledPanelFootNote,
  StyledPanelGrid,
  StyledPanelSection,
  StyledPanelSectionHead,
  StyledRoleChip,
} from "./ManagerForm.styled";

type ManagerFormProps = {
  /** 있으면 수정(옆 패널), 없으면 등록(대화상자). §5.13 에는 상세 GET 이 없어 목록 행 데이터를 그대로 받는다. */
  manager?: ManagerItemResponseTypes;
  onClose: () => void;
  /** 저장한 매니저의 id — 목록이 그 행을 잠깐 강조한다 */
  onDone: (savedManagerId?: string) => void;
  /** 옆 패널 아래 [삭제] — 삭제 확인 대화상자를 여는 일은 목록이 한다 */
  onDelete?: () => void;
  /** 오늘(`YYYY-MM-DD`) — 배치 현황의 오늘 · 내일 칸을 가른다. 안 주면 한국 시간 기준 오늘 */
  today?: string;
};

const ROLE_OPTIONS = [
  { value: "driver", label: "기사" },
  { value: "escort", label: "동승자" },
];
const ROLE_LABEL: Record<ManagerRole, string> = { driver: "기사", escort: "동승자" };
const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;

const assignmentText = (assignment: ManagerAssignmentTypes): string => `${assignment.busNo} ${DIRECTION_LABEL[assignment.direction]} ${formatClockTime(assignment.departTime)}`;

// §5.13 POST·PATCH /staff/managers(MGR-02·03) — 매니저 등록(대화상자) · 상세 수정(옆 패널).
// role 은 앱 권한을 직접 결정하므로(§5.13 "이 값이 앱 권한을 결정") select 로 명시적으로만 바꾼다.
// 배치 중(assigned_run_count > 0)이면 역할 변경 · 삭제를 서버가 409 로 막는다 — 화면이 먼저 잠그고 이유를 말한다(Ruling 817).
export const ManagerForm = ({ manager, onClose, onDone, onDelete, today = todayInSeoul() }: ManagerFormProps) => {
  const [name, setName] = useState(manager?.name ?? "");
  const [phone, setPhone] = useState(manager?.phone ?? "");
  const [role, setRole] = useState<ManagerRole>(manager?.role ?? "driver");
  const [workHours, setWorkHours] = useState<WorkHours>(manager?.workHours ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0 && !hasInvalidWorkHours(workHours);
  const assignedRunCount = manager?.assignedRunCount ?? 0;
  const locked = assignedRunCount > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request = { name: name.trim(), phone: phone.trim(), role, workHours };
      if (manager) {
        await updateManager(manager.id, request);
        onDone(manager.id);
      } else {
        const created = await createManager(request);
        onDone(created.id);
      }
    } catch (cause) {
      // W8 — §5.13 배치 중이면 역할 변경도 409 MANAGER_ASSIGNED(`Ruling 339`).
      // 서버 문구가 삭제 전용이라(`ErrorCode.java`) 수정 맥락에 맞게 바꿔 보여준다
      // (`ManagerDeleteDialog.tsx` 와 같은 판단).
      if (cause instanceof ApiError && cause.code === "MANAGER_ASSIGNED") {
        setError("배치 중인 매니저는 역할을 바꿀 수 없습니다 — 배치를 먼저 해제");
      } else {
        setError(cause instanceof ApiError ? cause.message : "매니저 저장에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nameAndPhone = manager ? (
    <StyledPanelGrid>
      <Input label="이름" required value={name} onChange={(event) => setName(event.target.value)} />
      <Input label="전화번호" required value={phone} onChange={(event) => setPhone(event.target.value)} />
    </StyledPanelGrid>
  ) : (
    <>
      <Input label="이름" required placeholder="예: 김하늘" value={name} onChange={(event) => setName(event.target.value)} />
      <Input label="전화번호" required placeholder="010-0000-0000" value={phone} onChange={(event) => setPhone(event.target.value)}
        hint="앱에서 가입 신청하면 승인할 때 이 기록에 연결됩니다. 아이디·비밀번호는 매니저가 가입할 때 직접 정합니다." />
    </>
  );

  const roleSelect = (
    <Select
      label="역할"
      aria-label="역할"
      options={ROLE_OPTIONS}
      value={role}
      disabled={locked}
      hint={locked ? "배치된 회차가 있어 바꿀 수 없습니다 — 배치를 먼저 해제" : "이 값이 앱 권한을 결정합니다 — 기사는 운행 화면, 동승자는 승하차 확인 화면"}
      onChange={(event) => setRole(event.target.value as ManagerRole)}
    />
  );

  const hoursEditor = <WorkHoursEditor value={workHours} onChange={setWorkHours} note={manager ? "배치 충돌 경고의 기준" : "선택 입력 · 배치 충돌 경고의 기준"} />;
  const errorBanner = error ? <AlertBanner tone="missed" title={error} /> : null;

  if (!manager) {
    return (
      <Dialog
        title="매니저 등록"
        width={480}
        showClose
        onClose={onClose}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button variant="primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </>
        }
      >
        <StyledFormStack>
          {nameAndPhone}
          {roleSelect}
          {hoursEditor}
          {errorBanner}
        </StyledFormStack>
      </Dialog>
    );
  }

  const todayRows = assignmentsOn(manager, today);
  const tomorrow = nextDay(today);
  const tomorrowRows = assignmentsOn(manager, tomorrow);

  return (
    <Drawer
      title={`${manager.name}`}
      width={520}
      onClose={onClose}
      footer={
        <StyledPanelFooter>
          {onDelete ? (
            <Button variant="dangerQuiet" icon="trash-2" disabled={locked || submitting} onClick={onDelete}>
              삭제
            </Button>
          ) : null}
          {locked ? <StyledPanelFootNote>배치 {assignedRunCount}회를 먼저 해제해야 삭제할 수 있습니다</StyledPanelFootNote> : null}
          <span />
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </StyledPanelFooter>
      }
    >
      <StyledRoleChip>{ROLE_LABEL[manager.role]}</StyledRoleChip>
      <StyledPanelSection>
        <StyledPanelSectionHead>기본 정보</StyledPanelSectionHead>
        {nameAndPhone}
        {roleSelect}
      </StyledPanelSection>
      <StyledPanelSection>{hoursEditor}</StyledPanelSection>
      <StyledAssignSection>
        <StyledPanelSectionHead>
          배치 현황
          <small>배치 중 {assignedRunCount}회</small>
        </StyledPanelSectionHead>
        <StyledAssignRow>
          <StyledAssignDay>오늘 {formatMonthDay(today)}</StyledAssignDay>
          <div>
            {todayRows.length === 0 ? "배치 없음" : null}
            {todayRows.map((assignment) => (
              <StyledAssignItem key={assignment.runId}>
                <span>{assignmentText(assignment)}</span>
                <RunStatusChip status={assignment.status} />
              </StyledAssignItem>
            ))}
          </div>
        </StyledAssignRow>
        <StyledAssignRow>
          <StyledAssignDay>내일 {formatMonthDay(tomorrow)}</StyledAssignDay>
          <div>
            {tomorrowRows.length === 0 ? "배치 없음" : tomorrowRows.map((assignment) => assignmentText(assignment)).join(" · ")}
          </div>
        </StyledAssignRow>
      </StyledAssignSection>
      {errorBanner}
    </Drawer>
  );
};
