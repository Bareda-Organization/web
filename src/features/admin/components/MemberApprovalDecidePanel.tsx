"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, Dialog, StatusChip, Textarea } from "@/shared/ui";
import { DefinitionList, LinkButton } from "@/shared/ui/display";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { decideStaffSignupRequest } from "../api";
import { lastLoginText } from "../lib/lastLogin";
import { withObject } from "../lib/korean";
import { isStaffQuotaFull } from "../lib/staffQuota";
import type { StaffSignupRequestItemResponseTypes } from "../types";
import { StyledDialogForm } from "./AcademyFormDialog.styled";
import { StyledAcademyDot, StyledPanelActions, StyledPanelBody, StyledPanelHeader, StyledPanelNote, StyledStaffSub, StyledSteps } from "./MemberApprovalsPage.styled";

type MemberApprovalDecidePanelProps = {
  request: StaffSignupRequestItemResponseTypes;
  onDone: () => void;
};

const DAY_MS = 86_400_000;

// 신청한 지 며칠째인지(신청 당일 = 1일째) — 오래 걸린 요청이 눈에 띄게.
const waitingDays = (requestedAt: string): number => Math.max(1, Math.floor((Date.now() - new Date(requestedAt).getTime()) / DAY_MS) + 1);

// §6.5 POST /admin/staff-signup-requests/{id}/decide (O-02). 학원당 관계자 1명 정원이라(STAFF_QUOTA_EXCEEDED) 재직 관계자가 이미 있는 학원은
// 승인 단추를 끄고 해결 순서를 같은 칸에 보인다 — 눌러서야 409 를 보면 왜 안 되는지, 무엇을 해야 하는지 알 수 없다(Ruling 807 · 827).
// 거절은 정원과 무관해 그대로 열어 둔다. 목록을 연 뒤 다른 관리자가 먼저 처리한 경우는 서버 409 를 아래 오류 띠로 그대로 보인다.
export const MemberApprovalDecidePanel = ({ request, onDone }: MemberApprovalDecidePanelProps) => {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isQuotaFull = isStaffQuotaFull(request.academyStaffCount);
  const staff = request.currentStaff;
  const accountsHref = `/member-accounts?academy=${request.academy.id}`;

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await decideStaffSignupRequest(request.requestId, { accept: true });
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "승인 처리에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await decideStaffSignupRequest(request.requestId, { accept: false, rejectReason: rejectReason.trim() });
      setRejecting(false);
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "거절 처리에 실패했습니다");
      setRejecting(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card padding={0} role="region" aria-label={`${request.name} 처리`}>
      <StyledPanelBody>
        <StyledPanelHeader>
          <h3>{request.name}</h3>
          {isQuotaFull ? <StatusChip tone="bad">승인 불가 · 정원 참</StatusChip> : <StatusChip tone="ok">승인 가능</StatusChip>}
        </StyledPanelHeader>

        <DefinitionList
          items={[
            {
              term: "신청 일시",
              value: (
                <>
                  {formatDateTime(request.requestedAt)} <StyledStaffSub>({waitingDays(request.requestedAt)}일째)</StyledStaffSub>
                </>
              ),
            },
            { term: "연락처", value: request.phone },
            {
              term: "소속 학원",
              value: (
                <>
                  <StyledAcademyDot aria-hidden="true" /> {request.academy.name}
                </>
              ),
            },
            {
              term: "재직 관계자",
              value: staff ? (
                <>
                  <b>{staff.name}</b> <StyledStaffSub>{staff.loginId} · 최근 로그인 {lastLoginText(staff.lastLoginAt)}</StyledStaffSub>
                </>
              ) : request.academyStaffCount > 0 ? (
                `${request.academyStaffCount}명`
              ) : (
                "없음"
              ),
            },
          ]}
        />

        {isQuotaFull ? (
          <AlertBanner tone="moving" title="지금은 승인할 수 없습니다">
            {request.academy.name}에는 이미 재직 중인 관계자가 있습니다(학원당 1명). 아래 순서로 처리하세요.
            <StyledSteps>
              <li>
                <Link href={accountsHref}>계정 관리</Link>에서 기존 관계자{staff ? ` ${withObject(staff.name)}` : "를"} 퇴사 처리
              </li>
              <li>이 화면으로 돌아와 {withObject(request.name)} 승인</li>
            </StyledSteps>
            <LinkButton href={accountsHref} variant="primary">
              계정 관리에서 퇴사 처리
            </LinkButton>
          </AlertBanner>
        ) : null}

        <StyledPanelActions>
          <Button variant="dangerQuiet" onClick={() => setRejecting(true)} disabled={submitting}>
            거절
          </Button>
          <Button variant="primary" onClick={handleAccept} disabled={submitting || isQuotaFull}>
            {submitting && !rejecting ? "처리 중..." : "승인"}
          </Button>
        </StyledPanelActions>
        <StyledPanelNote>
          {isQuotaFull ? "승인은 위 1번을 마치면 켜집니다. " : ""}승인하면 계정이 활성화되고, 관계자가 자기 학원의 가입 승인 업무를 시작합니다.
        </StyledPanelNote>

        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledPanelBody>

      {rejecting ? (
        <Dialog
          title={`${request.name} 가입 요청 거절`}
          showClose
          onClose={() => setRejecting(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRejecting(false)} disabled={submitting}>
                뒤로
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={submitting || !rejectReason.trim()}>
                {submitting ? "처리 중..." : "가입 거절"}
              </Button>
            </>
          }
          actionHint={!rejectReason.trim() ? "거절 사유를 입력하면 [가입 거절] 버튼이 켜집니다" : undefined}
        >
          <StyledDialogForm>
            <p style={{ margin: 0 }}>
              {request.academy.name} · {request.phone} · 거절하면 신청자에게 사유가 안내됩니다.
            </p>
            <Textarea
              label="거절 사유"
              required
              placeholder="예: 신청자 정보가 학원 기록과 일치하지 않음"
              hint="신청자에게 그대로 전달됩니다 · 학생 이름·연락처는 적지 마세요"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </StyledDialogForm>
        </Dialog>
      ) : null}
    </Card>
  );
};
