"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Textarea } from "@/shared/ui";
import { decideSignupRequest, searchManagerCandidates, searchStudentCandidates } from "../api";
import { SIGNUP_ROLE_LABEL } from "../lib/signupRoleLabel";
import type { SignupRequestItemResponseTypes } from "../types";
import { LinkCandidatePicker } from "./LinkCandidatePicker";
import { StyledDialogForm } from "./SignupDecideDialog.styled";

type SignupDecideDialogProps = {
  request: SignupRequestItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// Ruling 324 — 학부모(parent)는 가입 승인 시점에 학생 연결이 더 이상 필수가 아니다.
// 자녀 연결은 각 앱에서 학생이 만든 코드를 학부모가 입력하는 별도 2단계(§3.3·§3.4)로
// 진행하므로, 이 대화상자에는 학생 ID 입력 자리가 없다. 계정↔레코드 연결(AUTH-11)이
// 여전히 필수인 것은 student·driver·escort 뿐이다.
const needsStudentLink = (role: SignupRequestItemResponseTypes["role"]) => role === "student";
const needsManagerLink = (role: SignupRequestItemResponseTypes["role"]) => role === "driver" || role === "escort";

// §5.2 409 ALREADY_LINKED — 고른 학생·매니저가 이미 다른 계정과 연결됐거나(학부모는 이미 연결된 자녀) 해서 거절된 경우.
// 영문 코드·서버 원문은 화면에 내지 않고, 역할에 맞게 다시 고를 방향을 알려 준다. 계정은 pending 그대로다.
// 예전 목록이라 거절된 경우(다른 관계자가 먼저 처리했거나 요청이 없음)와 차단된 계정은 서버 원문 대신 한국어로 알린다(F02-06).
const STALE_REQUEST_CODES = ["APPROVAL_ALREADY_DECIDED", "SIGNUP_REQUEST_NOT_FOUND"];
const STALE_REQUEST_MESSAGE = "이미 다른 관계자가 처리한 요청입니다 — 목록을 새로 불러옵니다";
const BLOCKED_TARGET_MESSAGE = "승인 대상 계정이 차단된 상태입니다 — 차단을 먼저 해제해야 승인할 수 있습니다";

const isStaleRequest = (cause: unknown): boolean => cause instanceof ApiError && STALE_REQUEST_CODES.includes(cause.code);

const acceptErrorMessage = (cause: unknown, role: SignupRequestItemResponseTypes["role"]): string => {
  if (!(cause instanceof ApiError)) return "승인 처리에 실패했습니다";
  if (isStaleRequest(cause)) return STALE_REQUEST_MESSAGE;
  if (cause.code === "SIGNUP_TARGET_BLOCKED") return BLOCKED_TARGET_MESSAGE;
  if (cause.code !== "ALREADY_LINKED") return cause.message;
  if (needsStudentLink(role)) return "이미 다른 계정과 연결된 학생입니다 — 다른 학생을 고르세요";
  if (needsManagerLink(role)) return "이미 다른 계정과 연결된 매니저입니다 — 다른 매니저를 고르세요";
  return "이미 연결된 자녀가 있습니다";
};

// §5.2 POST /staff/signup-requests/{id}/decide(A-02). 수락 시 계정↔레코드 연결이
// 필수라(§5.2, 누락하면 422 LINK_REQUIRED) role 에 따라 studentIds 또는 managerId 를
// 받는다. 학생·매니저는 ID 를 직접 입력받지 않고 이름 검색 목록에서 고른다(R32-W3) —
// 목록 화면에 ID 가 보이지 않아 직접 입력으로는 사실상 승인이 불가능했다.
export const SignupDecideDialog = ({ request, onClose, onDone }: SignupDecideDialogProps) => {
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"accept" | "reject" | null>(null);
  // 이미 처리된 요청이라 더 결정할 수 없다 — [닫기] 가 목록을 새로 받게 한다.
  const [stale, setStale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchManagers = useCallback((q?: string) => searchManagerCandidates(request.role, q), [request.role]);

  const canAccept = needsStudentLink(request.role)
    ? studentIds.length > 0
    : needsManagerLink(request.role)
      ? managerIds.length > 0
      : true;

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await decideSignupRequest(request.requestId, {
        accept: true,
        link: needsStudentLink(request.role)
          ? { studentIds }
          : needsManagerLink(request.role)
            ? { managerId: managerIds[0] }
            : undefined,
      });
      onDone();
    } catch (cause) {
      setError(acceptErrorMessage(cause, request.role));
      setStale(isStaleRequest(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await decideSignupRequest(request.requestId, { accept: false, rejectReason: rejectReason.trim() });
      onDone();
    } catch (cause) {
      setError(
        isStaleRequest(cause)
          ? STALE_REQUEST_MESSAGE
          : cause instanceof ApiError
            ? cause.message
            : "거절 처리에 실패했습니다",
      );
      setStale(isStaleRequest(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={`${request.name} 가입 요청 처리`}
      onClose={stale ? onDone : onClose}
      footer={
        stale ? (
          <Button variant="primary" onClick={onDone}>
            닫기
          </Button>
        ) : mode === "reject" ? (
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
              뒤로
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={submitting || !rejectReason.trim()}>
              {submitting ? "처리 중..." : "거절 확정"}
            </Button>
          </>
        ) : mode === "accept" ? (
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
              뒤로
            </Button>
            <Button variant="primary" onClick={handleAccept} disabled={submitting || !canAccept}>
              {submitting ? "처리 중..." : "승인 확정"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button variant="danger" onClick={() => setMode("reject")}>
              거절
            </Button>
            <Button variant="primary" onClick={() => setMode("accept")}>
              승인
            </Button>
          </>
        )
      }
    >
      <StyledDialogForm>
        <p>
          {SIGNUP_ROLE_LABEL[request.role]} · {request.phone}
        </p>
        {mode === "accept" && needsStudentLink(request.role) ? (
          <>
            <p>연결할 학생을 이름으로 찾아 고르세요. 다자녀는 여러 명을 고를 수 있습니다.</p>
            <LinkCandidatePicker
              search={searchStudentCandidates}
              selectedIds={studentIds}
              onChange={setStudentIds}
              multiple
              placeholder="학생 이름으로 검색"
              initialQuery={request.name}
            />
          </>
        ) : null}
        {mode === "accept" && request.role === "parent" ? (
          <p>자녀 연결은 이 승인과 별도로 학부모 앱에서 진행됩니다(연결 코드 입력).</p>
        ) : null}
        {mode === "accept" && needsManagerLink(request.role) ? (
          <>
            <p>이 계정과 연결할 등록된 {SIGNUP_ROLE_LABEL[request.role]}를 골라 주세요.</p>
            <LinkCandidatePicker
              search={searchManagers}
              selectedIds={managerIds}
              onChange={setManagerIds}
              multiple={false}
              placeholder="매니저 이름으로 검색"
              initialQuery={request.name}
            />
          </>
        ) : null}
        {mode === "reject" ? (
          <Textarea
            label="거절 사유"
            required
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        ) : null}
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
