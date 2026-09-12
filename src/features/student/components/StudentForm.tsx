"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Checkbox, Dialog, Input, PhotoUploadField, Select } from "@/shared/ui";
import { createStudent, getStudentDetail, updateStudent } from "../api";
import type { StudentGender, StudentUpsertRequestTypes } from "../types";

type StudentFormProps = {
  /** 있으면 수정 대상 student_id, 없으면 신규 등록. */
  studentId?: string;
  onClose: () => void;
  onDone: () => void;
};

const GENDER_OPTIONS = [
  { value: "", label: "선택 안 함" },
  { value: "male", label: "남" },
  { value: "female", label: "여" },
];

// §5.11 POST·PATCH /staff/students(STU-02·03) — 학생 등록·수정 폼. 목록에는 이 폼이
// 필요한 필드(성별·생년월일·좌석 등)가 없어, 수정일 때는 상세 GET 을 따로 불러 채운다
// (§5.12/§5.13 과 달리 학생은 상세 GET 이 사양에 있다 — Ruling 없음, 실측 확인).
// 주소·보호자 연락처는 이 폼에 없다 — §5.11 "수정 — 주소·보호자 연락처는 대상 밖".
export const StudentForm = ({ studentId, onClose, onDone }: StudentFormProps) => {
  const [loading, setLoading] = useState(!!studentId);
  const [name, setName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [gender, setGender] = useState<StudentGender | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [grade, setGrade] = useState("");
  const [className, setClassName] = useState("");
  const [seatNo, setSeatNo] = useState("");
  const [note, setNote] = useState("");
  const [canGoAlone, setCanGoAlone] = useState(false);
  const [photo, setPhoto] = useState<File | null | undefined>(undefined);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | undefined>(undefined);
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
        setSeatNo(detail.seatNo != null ? String(detail.seatNo) : "");
        setNote(detail.note ?? "");
        setCanGoAlone(detail.canGoAlone);
        setExistingPhotoUrl(detail.photoUrl ?? undefined);
        setError(null);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "학생 정보를 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  const canSubmit = name.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request: StudentUpsertRequestTypes = {
        name: name.trim(),
        studentPhone: studentPhone.trim() || undefined,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
        grade: grade.trim() || undefined,
        className: className.trim() || undefined,
        seatNo: seatNo ? Number(seatNo) : undefined,
        note: note.trim() || undefined,
        canGoAlone,
        photo,
      };
      if (studentId) {
        await updateStudent(studentId, request);
      } else {
        await createStudent(request);
      }
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "학생 정보 저장에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={studentId ? "학생 정보 수정" : "학생 등록"}
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
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <PhotoUploadField existingPhotoUrl={existingPhotoUrl} onChange={setPhoto} />
          <Input label="이름" required value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="학생 연락처" value={studentPhone} onChange={(event) => setStudentPhone(event.target.value)} />
          <Select
            label="성별"
            options={GENDER_OPTIONS}
            value={gender}
            onChange={(event) => setGender(event.target.value as StudentGender | "")}
          />
          <Input label="생년월일" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          <Input label="학년" value={grade} onChange={(event) => setGrade(event.target.value)} />
          <Input label="반" value={className} onChange={(event) => setClassName(event.target.value)} />
          <Input label="좌석 번호" type="number" value={seatNo} onChange={(event) => setSeatNo(event.target.value)} />
          <Input label="메모" value={note} onChange={(event) => setNote(event.target.value)} />
          <Checkbox
            checked={canGoAlone}
            onChange={(event) => setCanGoAlone(event.target.checked)}
            label="혼자 하차 가능"
          />
          {error ? <AlertBanner tone="missed" title={error} /> : null}
        </>
      )}
    </Dialog>
  );
};
