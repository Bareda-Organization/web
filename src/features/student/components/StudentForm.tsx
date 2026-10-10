"use client";

import { useEffect, useState } from "react";
import { AccountPasswordResetDialog } from "@/features/auth";
import { ApiError } from "@/shared/lib/http";
import { confirmLeave } from "@/shared/lib/navigation/leaveGuard";
import { useLeaveWarning } from "@/shared/lib/navigation/useLeaveWarning";
import {
  AlertBanner,
  Button,
  Checkbox,
  Drawer,
  Input,
  PhotoUploadField,
  Select,
} from "@/shared/ui";
import { createStudent, getStudentDetail, updateStudent } from "../api";
import type {
  StudentGender,
  StudentGuardianTypes,
  StudentUpsertRequestTypes,
} from "../types";
import {
  StyledGuardianEmpty,
  StyledGuardianSection,
  StyledGuardianTitle,
} from "./StudentForm.styled";
import { WeeklyAddressSection } from "./WeeklyAddressSection";

type StudentFormProps = {
  /** 있으면 수정 대상 student_id, 없으면 신규 등록. */
  studentId?: string;
  onClose: () => void;
  /** 저장한 학생의 id — 목록이 그 행을 잠깐 강조한다 */
  onDone: (savedStudentId?: string) => void;
  /** 수정 패널 아래 왼쪽의 [퇴원 처리] — 목록 행마다 두면 행 클릭(수정)과 같은 줄에서 오조작하기 쉬워 패널 안으로 옮겼다(U-07). 등록에는 없다 */
  onWithdraw?: () => void;
};

// §5.11 특이사항(note · STU-07)은 200자까지 — 넘으면 서버가 422 로 거부한다.
const NOTE_MAX_LENGTH = 200;

const GENDER_OPTIONS = [
  { value: "", label: "선택 안 함" },
  { value: "male", label: "남" },
  { value: "female", label: "여" },
];

// §5.11 POST·PATCH /staff/students(STU-02·03) — 학생 등록·수정 폼. 목록에는 이 폼이
// 필요한 필드(성별·생년월일·좌석 등)가 없어, 수정일 때는 상세 GET 을 따로 불러 채운다
// (§5.12/§5.13 과 달리 학생은 상세 GET 이 사양에 있다 — Ruling 없음, 실측 확인).
// 주소는 이 폼에 없다(학부모가 요일별로 등록). 보호자 연락처는 수정할 때 고칠 수 있다(Ruling 326).
export const StudentForm = ({
  studentId,
  onClose,
  onDone,
  onWithdraw,
}: StudentFormProps) => {
  const [loading, setLoading] = useState(!!studentId);
  const [name, setName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [gender, setGender] = useState<StudentGender | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [grade, setGrade] = useState("");
  const [className, setClassName] = useState("");
  const [guardians, setGuardians] = useState<StudentGuardianTypes[]>([]);
  const [studentAccountId, setStudentAccountId] = useState<string | null>(null);
  // 관리자 경유 비밀번호 초기화(§5.22 · Ruling 329) 대상 — 학생 본인 또는 보호자 계정.
  const [resetTarget, setResetTarget] = useState<{
    accountId: string;
    name: string;
  } | null>(null);
  // 고친 보호자만 보낸다 — 안 고친 번호까지 보내면 다른 관계자가 그사이 고친 값을 옛 값으로 덮는다.
  const [originalPhones, setOriginalPhones] = useState<Record<string, string>>(
    {},
  );
  const [note, setNote] = useState("");
  // 수정 폼이 처음 받은 값 — 지운 항목을 가려내는 기준이다(아래 handleSubmit).
  const [original, setOriginal] = useState({
    studentPhone: "",
    gender: "",
    birthDate: "",
    grade: "",
    className: "",
    note: "",
  });
  const [canGoAlone, setCanGoAlone] = useState(false);
  const [photo, setPhoto] = useState<File | null | undefined>(undefined);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | undefined>(
    undefined,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      setLoading(true);
      try {
        const detail = await getStudentDetail(studentId);
        setName(detail.name);
        setStudentPhone(detail.studentPhone ?? "");
        setGender(detail.gender ?? "");
        setBirthDate(detail.birthDate ?? "");
        setGrade(detail.grade ?? "");
        setClassName(detail.className ?? "");
        setGuardians(detail.guardians);
        setStudentAccountId(detail.accountId);
        setOriginalPhones(
          Object.fromEntries(
            detail.guardians.map((guardian) => [
              guardian.guardianId,
              guardian.phone,
            ]),
          ),
        );
        setNote(detail.note ?? "");
        setOriginal({
          studentPhone: detail.studentPhone ?? "",
          gender: detail.gender ?? "",
          birthDate: detail.birthDate ?? "",
          grade: detail.grade ?? "",
          className: detail.className ?? "",
          note: detail.note ?? "",
        });
        setCanGoAlone(detail.canGoAlone);
        setExistingPhotoUrl(detail.photoUrl ?? undefined);
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : "학생 정보를 불러오지 못했습니다",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  const canSubmit = name.trim().length > 0 && !loading;

  // 저장하지 않은 입력이 있으면 앱 안 이동·창 닫기·이 대화상자 닫기에서 묻는다(R32-W13).
  const { dirty } = useLeaveWarning(
    JSON.stringify([
      name,
      studentPhone,
      gender,
      birthDate,
      grade,
      className,
      note,
      canGoAlone,
      guardians.map((guardian) => guardian.phone),
      photo?.name ?? null,
    ]),
    !loading,
    "저장하지 않은 학생 정보 입력이 사라집니다. 이 화면을 떠날까요?",
  );
  const requestClose = () => {
    if (!dirty || confirmLeave()) onClose();
  };

  // PATCH(§5.11 · Ruling 390)는 키가 없으면 "그대로 둔다"이고 선택 항목의 `null` 이 "지운다"이다. 그래서
  // 수정에서 지운 항목만 `null` 로 보내고, 원래 비어 있던 항목은 키를 뺀다(그사이 다른 관계자가 넣은 값을 덮지 않는다).
  const clearable = (current: string, before: string): string | null | undefined =>
    current.trim() || (studentId !== undefined && before !== "" ? null : undefined);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request: StudentUpsertRequestTypes = {
        name: name.trim(),
        studentPhone: clearable(studentPhone, original.studentPhone),
        gender: clearable(gender, original.gender) as StudentGender | null | undefined,
        birthDate: clearable(birthDate, original.birthDate),
        grade: clearable(grade, original.grade),
        className: clearable(className, original.className),
        guardians: studentId
          ? guardians
              .filter(
                (guardian) =>
                  guardian.phone.trim() !== originalPhones[guardian.guardianId],
              )
              .map((guardian) => ({
                guardianId: guardian.guardianId,
                phone: guardian.phone.trim(),
              }))
          : undefined,
        note: clearable(note, original.note),
        canGoAlone,
        photo,
      };
      if (studentId) {
        await updateStudent(studentId, request);
        onDone(studentId);
      } else {
        const created = await createStudent(request);
        onDone(created.studentId);
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "학생 정보 저장에 실패했습니다",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* 옆 패널 — 목록을 그대로 두고 오른쪽에서 수정한다. 퇴원은 1단계 파괴 동작이라 빨강 선, 아래 왼쪽 끝(U-07). */}
      <Drawer
        title={studentId ? "학생 정보 수정" : "학생 등록"}
        width={560}
        onClose={requestClose}
        footer={
          <>
            {studentId && onWithdraw ? (
              <Button variant="dangerQuiet" icon="trash-2" onClick={onWithdraw} disabled={submitting} style={{ marginRight: "auto" }}>
                퇴원 처리
              </Button>
            ) : null}
            <Button variant="ghost" onClick={requestClose} disabled={submitting}>
              취소
            </Button>
            <Button
              variant="primary"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </>
        }
      >
        {loading ? (
          <p>불러오는 중...</p>
        ) : (
          <>
            <PhotoUploadField
              existingPhotoUrl={existingPhotoUrl}
              onChange={setPhoto}
            />
            <Input
              label="이름"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label="학생 연락처"
              value={studentPhone}
              onChange={(event) => setStudentPhone(event.target.value)}
            />
            <Select
              label="성별"
              options={GENDER_OPTIONS}
              value={gender}
              onChange={(event) =>
                setGender(event.target.value as StudentGender | "")
              }
            />
            <Input
              label="생년월일"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
            <Input
              label="학년"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
            />
            <Input
              label="반"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            />
            {studentId ? (
              <StyledGuardianSection>
                <StyledGuardianTitle>보호자 연락처</StyledGuardianTitle>
                {guardians.length === 0 ? (
                  <StyledGuardianEmpty>
                    연결된 보호자가 없습니다 — 학생 앱에서 연결 코드를 만들고
                    학부모 앱에서 입력하면 연결됩니다.
                  </StyledGuardianEmpty>
                ) : (
                  guardians.map((guardian) => (
                    <div key={guardian.guardianId}>
                      <Input
                        label={`${guardian.name} 연락처`}
                        aria-label={`${guardian.name} 연락처`}
                        inputMode="tel"
                        value={guardian.phone}
                        onChange={(event) =>
                          setGuardians((previous) =>
                            previous.map((item) =>
                              item.guardianId === guardian.guardianId
                                ? { ...item, phone: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setResetTarget({
                            accountId: guardian.accountId,
                            name: guardian.name,
                          })
                        }
                      >
                        {guardian.name} 비밀번호 초기화
                      </Button>
                    </div>
                  ))
                )}
                {studentAccountId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setResetTarget({ accountId: studentAccountId, name })
                    }
                  >
                    학생 계정 비밀번호 초기화
                  </Button>
                ) : null}
              </StyledGuardianSection>
            ) : null}
            {studentId ? <WeeklyAddressSection studentId={studentId} /> : null}
            <Input
              label="특이사항"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={NOTE_MAX_LENGTH}
            />
            <Checkbox
              checked={canGoAlone}
              onChange={(event) => setCanGoAlone(event.target.checked)}
              label="혼자 귀가 가능"
            />
            {error ? <AlertBanner tone="missed" title={error} /> : null}
          </>
        )}
      </Drawer>
      {resetTarget ? (
        <AccountPasswordResetDialog
          accountId={resetTarget.accountId}
          name={resetTarget.name}
          onClose={() => setResetTarget(null)}
        />
      ) : null}
    </>
  );
};
