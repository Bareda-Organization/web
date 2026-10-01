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

// §6.2 메모는 200자까지 — 넘으면 서버가 422 로 거부한다.
const MEMO_MAX_LENGTH = 200;

// §6.2·§6.3 주소를 좌표로 옮기지 못하면 저장이 보류된다(Ruling 374) — 서버 원문 대신 고칠 자리를 알린다.
const saveErrorMessage = (cause: unknown): string => {
  if (!(cause instanceof ApiError)) return "저장에 실패했습니다";
  switch (cause.code) {
    case "ADDRESS_VERIFICATION_FAILED":
      return "주소를 확인하지 못했습니다. 주소를 다시 확인해 주세요";
    case "ADDRESS_VERIFICATION_UNAVAILABLE":
      return "주소 확인 서비스에 연결하지 못했습니다. 잠시 뒤 다시 저장해 주세요";
    default:
      return cause.message;
  }
};

// Ruling 450 — 주소가 없으면 그 학원의 회차 확정이 전부 ACADEMY_COORDINATES_MISSING 으로 실패해 등록·수정 때 막는다.
const ADDRESS_REQUIRED_MESSAGE = "주소를 입력해 주세요. 주소가 없으면 이 학원의 운행 회차를 확정할 수 없습니다";

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
  const [confirmingInactive, setConfirmingInactive] = useState(false);

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

  // 운영 중 학원을 비활성으로 바꾸는 저장만 확인을 거친다(UF-O-04) — 다른 수정은 바로 저장한다.
  const isDeactivating = isEditMode && detail?.status === "active" && status === "inactive";

  const isAddressMissing = address.trim().length === 0;
  // 주소 없이 저장된 옛 학원의 상태 변경(비활성화 등)은 주소 없이 허용한다 — 운영을 멈추는 조작을 주소 입력이 막으면
  // 안 된다(조율자 결정 2026-10-01 · Ruling 496). 서버는 address 키가 없으면 기존 값을 유지한다(§6.3).
  const canOmitAddress = isEditMode && detail !== null && (detail.address ?? "").trim() === "" && status !== detail.status;
  const canSubmit =
    name.trim().length > 0 && region.trim().length > 0 && (!isAddressMissing || canOmitAddress);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode) {
        await updateAcademy(academyId, {
          name: name.trim(),
          region: region.trim(),
          // 원래 비었고 그대로면 키를 보내지 않는다 — 빈 문자열을 보내면 서버가 422 로 거절한다(Ruling 450).
          address: isAddressMissing ? undefined : address.trim(),
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
        address: address.trim(),
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
      setError(saveErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmingInactive && detail) {
    return (
      <Dialog
        title="학원을 비활성으로 바꿀까요?"
        onClose={() => setConfirmingInactive(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingInactive(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmingInactive(false);
                void handleSubmit();
              }}
            >
              비활성으로 저장
            </Button>
          </>
        }
      >
        <StyledDialogForm>
          <AlertBanner tone="missed" title={`${detail.name} — 소속 사용자 ${detail.userCount}명 · 관계자 ${detail.staffCount}명`}>
            비활성으로 바꾸면 가입용 학원 검색에서 빠지고 신규 가입 요청이 막힙니다. 이미 가입한 소속 사용자는 지금처럼 로그인해 계속 쓸 수 있습니다.
          </AlertBanner>
        </StyledDialogForm>
      </Dialog>
    );
  }

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
          <Button
            variant="primary"
            onClick={isDeactivating ? () => setConfirmingInactive(true) : handleSubmit}
            disabled={submitting || !canSubmit || loadingDetail}
          >
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
            <Input
              label="주소"
              required
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              // 수정 화면에서 비어 있으면 주소 없이 저장돼 있던 학원이라 처음부터 오류 색으로, 등록은 입력 안내로 보인다.
              error={isAddressMissing && isEditMode && !canOmitAddress ? ADDRESS_REQUIRED_MESSAGE : undefined}
              hint={
                canOmitAddress && isAddressMissing
                  ? "주소 없이 저장된 학원이라 상태만 바꾸는 저장은 주소 없이 됩니다. 그 밖의 수정은 주소를 입력해 주세요."
                  : isAddressMissing && !isEditMode
                    ? ADDRESS_REQUIRED_MESSAGE
                    : undefined
              }
            />
            <Input label="연락처" value={contact} onChange={(event) => setContact(event.target.value)} />
            <Textarea label="메모" value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} maxLength={MEMO_MAX_LENGTH} />
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
