"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, Dialog, Drawer, Input, StatusChip, Switch, Textarea, useToast } from "@/shared/ui";
import { DefinitionList, LinkButton } from "@/shared/ui/display";
import { createAcademy, getAcademy, updateAcademy } from "../api";
import { lastLoginText } from "../lib/lastLogin";
import { withObject } from "../lib/korean";
import type { AcademyDetailResponseTypes, AcademyStatus } from "../types";
import {
  StyledAvatar,
  StyledCode,
  StyledCodeLine,
  StyledDialogForm,
  StyledDialogFormRow,
  StyledSection,
  StyledSectionTitle,
  StyledStaffName,
  StyledStaffRow,
  StyledSubLine,
} from "./AcademyFormDialog.styled";

type AcademyFormDialogProps = {
  /** 없으면 등록 모드(대화상자), 있으면 그 학원 수정 모드(옆 패널) */
  academyId?: string;
  onClose: () => void;
  /** 저장을 끝냈다 — 패널을 닫고 목록을 다시 읽는다 */
  onDone: () => void;
  /** 패널을 연 채 학원 상태만 바뀌었다 — 목록만 다시 읽는다 */
  onChanged?: () => void;
};

// §6.2 메모는 200자까지 — 넘으면 서버가 422 로 거부한다.
const MEMO_MAX_LENGTH = 200;
const MEMO_HINT = "학생 이름·연락처는 적지 마세요";

const ADDRESS_FAILED_MESSAGE = "주소를 확인하지 못했습니다. 도로명 주소를 다시 확인해 주세요";

// §6.2·§6.3 주소를 좌표로 옮기지 못하면 저장이 보류된다(Ruling 374) — 서버 원문 대신 고칠 자리를 알린다.
const saveErrorMessage = (cause: unknown): string => {
  if (!(cause instanceof ApiError)) return "저장에 실패했습니다";
  switch (cause.code) {
    case "ADDRESS_VERIFICATION_FAILED":
      return ADDRESS_FAILED_MESSAGE;
    case "ADDRESS_VERIFICATION_UNAVAILABLE":
      return "주소 확인 서비스에 연결하지 못했습니다. 잠시 뒤 다시 저장해 주세요";
    default:
      return cause.message;
  }
};

// Ruling 450 — 주소가 없으면 그 학원의 회차 확정이 전부 ACADEMY_COORDINATES_MISSING 으로 실패해 등록·수정 때 막는다.
const ADDRESS_REQUIRED_MESSAGE = "주소를 입력해 주세요. 주소가 없으면 이 학원의 운행 회차를 확정할 수 없습니다";

// §6.2 학원 등록 · §6.3 학원 수정 (O-01). 등록은 대화상자, 수정은 목록을 두고 보는 옆 패널이다(R48 시안 `academies--create` · `--detail`).
// 필드 구성이 거의 같아(§6.3 은 code 만 제외) 한 컴포넌트가 두 모양을 그린다 — 화면을 둘로 쪼개면 등록 직후 검색에 뜨는지(§4.4) 확인할 자리가 늘어난다.
export const AcademyFormDialog = ({ academyId, onClose, onDone, onChanged }: AcademyFormDialogProps) => {
  const isEditMode = academyId != null;
  const toast = useToast();
  const [loadingDetail, setLoadingDetail] = useState(isEditMode);
  const [detail, setDetail] = useState<AcademyDetailResponseTypes | null>(null);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<AcademyStatus>("active");

  const [submitting, setSubmitting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
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

  const isAddressMissing = address.trim().length === 0;
  const canSubmit = name.trim().length > 0 && region.trim().length > 0 && !isAddressMissing;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setAddressError(null);
    try {
      if (isEditMode) {
        await updateAcademy(academyId, {
          name: name.trim(),
          region: region.trim(),
          address: address.trim(),
          contact: contact.trim() || undefined,
          memo: memo.trim() || undefined,
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
      const message = saveErrorMessage(cause);
      if (message === ADDRESS_FAILED_MESSAGE) setAddressError(message);
      else setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // 운영 상태 스위치 — 상태만 바로 저장한다(다른 칸의 미저장 수정은 건드리지 않는다). 비활성으로 내리는 쪽만 확인을 거친다(UF-O-04 · Ruling 828 D5).
  // 주소 없이 저장된 옛 학원도 address 키 없이 상태만 보내므로 그대로 허용된다(Ruling 496 · §6.3 키 없음 = 유지).
  const applyStatus = async (next: AcademyStatus) => {
    if (!isEditMode || !detail) return;
    setStatusBusy(true);
    setError(null);
    try {
      await updateAcademy(academyId, { status: next });
      setStatus(next);
      setDetail({ ...detail, status: next });
      toast.show({ title: next === "inactive" ? `${withObject(detail.name)} 비활성화했습니다` : `${withObject(detail.name)} 다시 운영 중으로 바꿨습니다` });
      onChanged?.();
    } catch (cause) {
      setError(saveErrorMessage(cause));
    } finally {
      setStatusBusy(false);
      setConfirmingInactive(false);
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

  const nameInput = <Input label="학원명" required value={name} onChange={(event) => setName(event.target.value)} />;
  const regionInput = <Input label="지역" required value={region} onChange={(event) => setRegion(event.target.value)} />;
  const addressInput = (
    <Input
      label="주소"
      required
      value={address}
      onChange={(event) => {
        setAddress(event.target.value);
        setAddressError(null);
      }}
      // 수정 화면에서 비어 있으면 주소 없이 저장돼 있던 학원이라 처음부터 오류 색으로, 등록은 입력 안내로 보인다.
      error={addressError ?? (isAddressMissing && isEditMode ? ADDRESS_REQUIRED_MESSAGE : undefined)}
      hint={
        isAddressMissing && !isEditMode
          ? ADDRESS_REQUIRED_MESSAGE
          : "저장하면 서버가 주소로 학원 좌표를 구합니다 — 좌표가 없으면 이 학원의 회차를 확정할 수 없습니다."
      }
    />
  );
  const contactInput = <Input label="대표 연락처" placeholder="예: 032-000-0000" value={contact} onChange={(event) => setContact(event.target.value)} />;
  const memoInput = (
    <Textarea label="내부 메모" hint={MEMO_HINT} value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} maxLength={MEMO_MAX_LENGTH} />
  );
  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={submitting}>
        취소
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={submitting || !canSubmit || loadingDetail}>
        {submitting ? "저장 중..." : "저장"}
      </Button>
    </>
  );

  if (!isEditMode) {
    return (
      <Dialog title="학원 등록" showClose onClose={onClose} footer={footer} width={440}>
        <StyledDialogForm>
          <AlertBanner tone="info" title="학원 코드는 저장할 때 자동으로 만들어집니다">
            같은 이름 · 지역의 학원이 있으면 저장은 되고 경고만 드립니다(분원일 수 있음).
          </AlertBanner>
          <StyledDialogFormRow>
            {nameInput}
            {regionInput}
          </StyledDialogFormRow>
          {addressInput}
          {contactInput}
          {memoInput}
          {error ? <AlertBanner tone="missed" title={error} /> : null}
        </StyledDialogForm>
      </Dialog>
    );
  }

  const movingNos = detail?.stats.movingBusNos ?? [];
  const staff = detail?.staffAccounts[0];

  return (
    <>
      <Drawer title="학원 정보 수정" onClose={onClose} footer={footer}>
        <StyledDialogForm>
          {loadingDetail ? <p role="status">불러오는 중...</p> : null}
          {!loadingDetail ? (
            <>
              {detail ? (
                <StyledCodeLine>
                  <StyledCode>{detail.code}</StyledCode>
                  학원 코드는 수정할 수 없습니다
                </StyledCodeLine>
              ) : null}
              {detail ? (
                <StyledSection>
                  <StyledSectionTitle>상태</StyledSectionTitle>
                  <Card tone="outline" padding={14}>
                    <Switch
                      checked={status === "active"}
                      disabled={statusBusy}
                      onChange={(event) => (event.target.checked ? void applyStatus("active") : setConfirmingInactive(true))}
                      label={<b>{status === "active" ? "운영 중" : "비활성"}</b>}
                      sublabel="비활성으로 바꾸면 가입 검색에서 빠지고 신규 가입이 막힙니다. 이미 가입한 사용자는 계속 로그인합니다."
                    />
                  </Card>
                </StyledSection>
              ) : null}
              <StyledSection>
                <StyledSectionTitle>기본 정보</StyledSectionTitle>
                <StyledDialogFormRow>
                  {nameInput}
                  {regionInput}
                </StyledDialogFormRow>
                {addressInput}
                {contactInput}
                {memoInput}
              </StyledSection>
              {detail ? (
                <StyledSection>
                  <StyledSectionTitle>소속 관계자</StyledSectionTitle>
                  {staff ? (
                    <StyledStaffRow>
                      <StyledAvatar aria-hidden="true">{staff.name.slice(0, 1)}</StyledAvatar>
                      <div>
                        <StyledStaffName>
                          <b>{staff.name}</b>
                          <small>{staff.loginId}</small>
                        </StyledStaffName>
                        <StyledSubLine>최근 로그인 {lastLoginText(staff.lastLoginAt)}</StyledSubLine>
                      </div>
                      <LinkButton href={`/member-accounts?academy=${detail.id}`} aria-label={`${staff.name} 계정 관리`}>
                        계정 관리
                      </LinkButton>
                    </StyledStaffRow>
                  ) : (
                    <StyledSubLine>재직 중인 관계자가 없습니다.</StyledSubLine>
                  )}
                  <DefinitionList
                    items={[
                      { term: "이용자", value: `${detail.userCount}명` },
                      {
                        term: "운행 중 차량",
                        value: (
                          <>
                            {detail.stats.movingBusCount}대{movingNos.length > 0 ? <small> ({movingNos.join(", ")})</small> : null}
                          </>
                        ),
                      },
                    ]}
                  />
                </StyledSection>
              ) : null}
              {error ? <AlertBanner tone="missed" title={error} /> : null}
            </>
          ) : null}
        </StyledDialogForm>
      </Drawer>
      {confirmingInactive && detail ? (
        <Dialog
          title={`${detail.name} 비활성화`}
          showClose
          onClose={() => setConfirmingInactive(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmingInactive(false)}>
                취소
              </Button>
              <Button variant="danger" disabled={statusBusy} onClick={() => void applyStatus("inactive")}>
                학원 비활성화
              </Button>
            </>
          }
        >
          <StyledDialogForm>
            <p style={{ margin: 0 }}>
              <b>{detail.name}</b>을 비활성화할까요?
            </p>
            <DefinitionList
              items={[
                { term: "소속 사용자", value: `${detail.userCount}명 · 관계자 ${detail.staffCount}명` },
                {
                  term: "바뀌는 것",
                  value: (
                    <>
                      <StatusChip tone="warn" marker={false}>
                        가입 차단
                      </StatusChip>{" "}
                      가입용 학원 검색에서 빠지고, 신규 가입 요청이 막힙니다
                    </>
                  ),
                },
                { term: "그대로인 것", value: "이미 가입한 사용자는 계속 로그인합니다 — 운행 중인 기사 · 동승자의 명단 조회가 끊기지 않습니다" },
              ]}
            />
          </StyledDialogForm>
        </Dialog>
      ) : null}
    </>
  );
};
