"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Select } from "@/shared/ui";
import { createManager, updateManager } from "../api";
import type { ManagerItemResponseTypes, ManagerRole, WorkHours } from "../types";
import { WorkHoursEditor } from "./WorkHoursEditor";

type ManagerFormProps = {
  /** 있으면 수정, 없으면 등록. §5.13 에는 상세 GET 이 없어 목록 행 데이터를 그대로 받는다. */
  manager?: ManagerItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

const ROLE_OPTIONS = [
  { value: "driver", label: "기사" },
  { value: "escort", label: "동승자" },
];

// §5.13 POST·PATCH /staff/managers(MGR-02·03) — 매니저 등록·수정 폼.
// role 은 앱 권한을 직접 결정하므로(§5.13 "이 값이 앱 권한을 결정") select 로 명시적으로만 바꾼다.
export const ManagerForm = ({ manager, onClose, onDone }: ManagerFormProps) => {
  const [name, setName] = useState(manager?.name ?? "");
  const [phone, setPhone] = useState(manager?.phone ?? "");
  const [role, setRole] = useState<ManagerRole>(manager?.role ?? "driver");
  const [workHours, setWorkHours] = useState<WorkHours>(manager?.workHours ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request = { name: name.trim(), phone: phone.trim(), role, workHours };
      if (manager) {
        await updateManager(manager.id, request);
      } else {
        await createManager(request);
      }
      onDone();
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

  return (
    <Dialog
      title={manager ? "매니저 정보 수정" : "매니저 등록"}
      width={480}
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
      <Input label="이름" required value={name} onChange={(event) => setName(event.target.value)} />
      <Input label="전화번호" required value={phone} onChange={(event) => setPhone(event.target.value)} />
      <Select
        label="역할"
        options={ROLE_OPTIONS}
        value={role}
        onChange={(event) => setRole(event.target.value as ManagerRole)}
      />
      <WorkHoursEditor value={workHours} onChange={setWorkHours} />
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
