"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Dialog, Input, SegmentedControl, Textarea } from "@/shared/ui";
import { createAcademy, getAcademy, updateAcademy } from "../api";
import type { AcademyDetailResponseTypes, AcademyStatus } from "../types";
import { StyledDialogForm, StyledDialogFormRow, StyledStaffAccountList } from "./AcademyFormDialog.styled";

type AcademyFormDialogProps = {
  /** 없으면 등록 모드, 있으면 그 학원 수정 모드 */
  academyId?: string;
  onClose: () => void;
  onDone: () => void;
};

const STATUS_OPTIONS = [
  { value: "active", label: "운영 중" },
  { value: "inactive", label: "비활성" },
];

// §6.2 학원 등록 · §6.3 학원 수정 (O-01). 등록·수정을 한 다이얼로그에 합친 이유는
// 필드 구성이 거의 같고(§6.3 은 code 만 제외) 화면을 둘로 쪼개면 검색 흐름
// (§4.4 "등록 후 검색에 뜨는 것이 출발점")을 확인할 자리가 하나 더 늘기 때문이다
// (판단 근거, 보고서 §1).
export const AcademyFormDialog = ({ academyId, onClose, onDone }: AcademyFormDialogProps) => {
  const isEditMode = academyId != null;
  const [loadingDetail, setLoadingDetail] = useState(isEditMode);
  const [detail, setDetail] = useState<AcademyDetailResponseTypes | null>(null);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<AcademyStatus>("active");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        const data = await getAcademy(academyId);
        setDetail(data);
        setName(data.name);
        setRegion(data.region);
        setAddress(data.address ?? "");
        setContact(data.contact ?? "");
        setMemo(data.memo ?? "");
        setStatus(data.status);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "학원 정보를 불러오지 못했습니다");
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [academyId, isEditMode]);

  const canSubmit = name.trim().length > 0 && region.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode) {
        await updateAcademy(academyId, {
          name: name.trim(),
          region: region.trim(),
          address: address.trim() || undefined,
          contact: contact.trim() || undefined,
          memo: memo.trim() || undefined,
          status,
        });
        onDone();
        return;
      }
      const created = await createAcademy({
        name: name.trim(),
        region: region.trim(),
        address: address.trim() || undefined,
        contact: contact.trim() || undefined,
        memo: memo.trim() || undefined,
      });
      // 중복 경고는 저장을 막지 않는다(§6.2) — 저장은 이미 끝났으니 사용자가 그
      // 사실을 읽고 확인을 눌러야 닫히게 한다. 경고가 없으면 바로 닫는다.
      if (created.warnings.length > 0) {
        setWarnings(created.warnings);
        return;
      }
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "저장에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (warnings) {
    return (
      <Dialog
        title="학원 등록 완료"
        onClose={onDone}
        footer={
          <Button variant="primary" onClick={onDone}>
            확인
          </Button>
        }
      >
        <StyledDialogForm>
          <AlertBanner tone="moving" title="같은 이름 · 지역의 학원이 이미 있습니다">
            그래도 저장됐습니다. 목록에서 다른 학원과 혼동되지 않는지 확인하세요.
          </AlertBanner>
        </StyledDialogForm>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={isEditMode ? "학원 정보 수정" : "학원 등록"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !canSubmit || loadingDetail}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </>
      }
    >
      <StyledDialogForm>
        {loadingDetail ? <p>불러오는 중...</p> : null}
        {!loadingDetail ? (
          <>
            {isEditMode && detail ? <Badge tone="brand">{detail.code}</Badge> : null}
            <StyledDialogFormRow>
              <Input label="학원명" required value={name} onChange={(event) => setName(event.target.value)} />
              <Input label="지역" required value={region} onChange={(event) => setRegion(event.target.value)} />
            </StyledDialogFormRow>
            <Input label="주소" value={address} onChange={(event) => setAddress(event.target.value)} />
            <Input label="연락처" value={contact} onChange={(event) => setContact(event.target.value)} />
            <Textarea label="메모" value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} />
            {isEditMode ? (
              <SegmentedControl
                options={STATUS_OPTIONS}
                value={status}
                onChange={(value) => setStatus(value as AcademyStatus)}
              />
            ) : null}
            {isEditMode && detail && detail.staffAccounts.length > 0 ? (
              <StyledStaffAccountList>
                {detail.staffAccounts.map((account) => (
                  <li key={account.accountId}>
                    {account.name} ({account.loginId})
                  </li>
                ))}
              </StyledStaffAccountList>
            ) : null}
            {error ? <AlertBanner tone="missed" title={error} /> : null}
          </>
        ) : null}
      </StyledDialogForm>
    </Dialog>
  );
};
