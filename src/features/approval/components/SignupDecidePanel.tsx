"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, StatusChip, Textarea, useToast } from "@/shared/ui";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { decideSignupRequest, searchManagerCandidates, searchStudentCandidates } from "../api";
import { SIGNUP_ROLE_LABEL } from "../lib/signupRoleLabel";
import type { SignupRequestItemResponseTypes } from "../types";
import { LinkCandidatePicker } from "./LinkCandidatePicker";
import { StyledDialogForm, StyledPanel, StyledPanelActions, StyledPanelHead, StyledPanelList, StyledPanelSection } from "./SignupApprovalPage.styled";

type SignupDecidePanelProps = {
  request: SignupRequestItemResponseTypes;
  /** 승인·거절이 끝났거나 이미 처리된 요청이라 목록을 새로 받아야 할 때 */
  onDone: () => void;
  /** 신청 일시 옆 "20시간 전" — 호출부가 계산한 값 */
  waited: string;
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
// R48 — 목록 오른쪽에 붙박이로 둔 처리 패널이다. 대화상자는 뒤의 목록을 가려 요청마다 닫고 다시 열어야 했다.
// 승인은 한 번에(되돌림 없는 확인 단계 없음 — 연결 후보를 고르는 것이 확인이다), 거절만 사유를 받는 대화상자(U-13)로 뺀다.
export const SignupDecidePanel = ({ request, onDone, waited }: SignupDecidePanelProps) => {
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  // 이미 처리된 요청이라 더 결정할 수 없다 — [닫기] 가 목록을 새로 받게 한다.
  const [stale, setStale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

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
      show({ title: `${request.name} 가입을 승인했습니다`, detail: "신청자에게 결과 알림이 갑니다" });
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
      setRejectOpen(false);
      show({ title: `${request.name} 가입 요청을 거절했습니다`, detail: "사유가 신청자에게 안내됩니다" });
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
      setRejectOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StyledPanel aria-label={`${request.name} 가입 요청 처리`}>
      <StyledPanelHead>
        <h2>{request.name}</h2>
        <StatusChip tone={request.role === "student" ? "info" : "off"} marker={false}>
          {SIGNUP_ROLE_LABEL[request.role]}
        </StatusChip>
      </StyledPanelHead>
      <StyledPanelList>
        <div>
          <dt>연락처</dt>
          <dd>{request.phone}</dd>
        </div>
        <div>
          <dt>신청 일시</dt>
          <dd>
            {formatDateTime(request.requestedAt)}
            {waited ? <small>({waited})</small> : null}
          </dd>
        </div>
      </StyledPanelList>

      {needsStudentLink(request.role) ? (
        <StyledPanelSection>
          <h3>연결할 학생</h3>
          <p>이 계정과 연결할 등록된 학생을 이름으로 찾아 고르세요. 다자녀는 여러 명을 고를 수 있습니다. 연결이 없으면 데이터를 볼 수 없습니다.</p>
          <LinkCandidatePicker
            search={searchStudentCandidates}
            selectedIds={studentIds}
            onChange={setStudentIds}
            multiple
            placeholder="학생 이름으로 검색"
            initialQuery={request.name}
          />
        </StyledPanelSection>
      ) : null}
      {request.role === "parent" ? (
        <StyledPanelSection>
          <p>학부모는 승인만 하면 계정이 활성화됩니다. 자녀 연결은 이 승인과 별도로 학부모 앱에서 진행됩니다(연결 코드 입력).</p>
        </StyledPanelSection>
      ) : null}
      {needsManagerLink(request.role) ? (
        <StyledPanelSection>
          <h3>연결할 등록 {SIGNUP_ROLE_LABEL[request.role]}</h3>
          <p>이 계정과 연결할 {SIGNUP_ROLE_LABEL[request.role]}를 고르세요. 연결이 없으면 데이터를 볼 수 없습니다.</p>
          <LinkCandidatePicker
            search={searchManagers}
            selectedIds={managerIds}
            onChange={setManagerIds}
            multiple={false}
            placeholder="매니저 이름으로 검색"
            initialQuery={request.name}
          />
          <p>{SIGNUP_ROLE_LABEL[request.role]} 한 명은 계정 한 개에만 연결됩니다.</p>
        </StyledPanelSection>
      ) : null}

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <StyledPanelActions>
        {stale ? (
          <Button variant="primary" onClick={onDone}>
            닫기
          </Button>
        ) : (
          <>
            <Button variant="dangerQuiet" disabled={submitting} onClick={() => setRejectOpen(true)}>
              거절
            </Button>
            <Button variant="primary" disabled={submitting || !canAccept} onClick={handleAccept}>
              {submitting && !rejectOpen ? "처리 중..." : "승인"}
            </Button>
          </>
        )}
      </StyledPanelActions>

      <Dialog
        open={rejectOpen}
        title={`${request.name} 가입 요청 거절`}
        showClose
        onClose={() => setRejectOpen(false)}
        actionHint={rejectReason.trim() ? undefined : "사유를 입력하면 [가입 거절] 버튼이 켜집니다. 거절하면 되돌릴 수 없습니다."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={submitting}>
              뒤로
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={submitting || !rejectReason.trim()}>
              {submitting ? "처리 중..." : "가입 거절"}
            </Button>
          </>
        }
      >
        <StyledDialogForm>
          <p>
            {request.name} · {SIGNUP_ROLE_LABEL[request.role]} · {request.phone} · 거절하면 신청자에게 사유가 안내됩니다.
          </p>
          <Textarea
            label="거절 사유"
            required
            maxLength={200}
            placeholder="예: 학원 기록에 없는 이름입니다"
            hint="신청자에게 그대로 전달됩니다 · 학생 이름·연락처는 적지 마세요"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </StyledDialogForm>
      </Dialog>
    </StyledPanel>
  );
};
