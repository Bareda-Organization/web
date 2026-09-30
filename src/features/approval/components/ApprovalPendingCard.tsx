"use client";

import Link from "next/link";
import { Card } from "@/shared/ui";
import { formatRemaining, useNowEverySecond } from "../lib/remainingTime";
import { useApprovalPending } from "./ApprovalPendingProvider";
import {
  StyledPendingBody,
  StyledPendingDeadline,
  StyledPendingItem,
  StyledPendingTitle,
} from "./ApprovalPendingCard.styled";

// 대시보드의 "처리 대기 · 기한 임박" 띠 — 구간 변경 신청은 기한을 넘기면 자동 거절되어 학부모에게 실패 통지가 나가므로,
// 남은 시간을 바로 보여 준다(A-05). 첫 조회 전에는 0 을 "없음" 으로 읽지 않게 그리지 않는다.
export const ApprovalPendingCard = () => {
  const { signupCount, changeCount, nextDeadlineAt, isReady } = useApprovalPending();
  const now = useNowEverySecond();
  if (!isReady) return null;

  const remaining = nextDeadlineAt ? formatRemaining(Date.parse(nextDeadlineAt), now) : null;
  const hasPending = signupCount + changeCount > 0;

  return (
    <Card padding={0} aria-label="처리 대기">
      <StyledPendingBody>
        <StyledPendingTitle>처리 대기 · 기한 임박</StyledPendingTitle>
        {hasPending ? (
          <>
            <StyledPendingItem as={Link} href="/signup-approval">
              가입 승인 {signupCount}건
            </StyledPendingItem>
            <StyledPendingItem as={Link} href="/change-approval">
              구간 변경 승인 {changeCount}건
            </StyledPendingItem>
            {nextDeadlineAt ? (
              <StyledPendingDeadline>
                {remaining ? `가장 이른 구간 변경 자동 거절까지 ${remaining}` : "기한이 지난 구간 변경 신청이 있습니다"}
              </StyledPendingDeadline>
            ) : null}
          </>
        ) : (
          <StyledPendingDeadline>처리할 승인 요청이 없습니다</StyledPendingDeadline>
        )}
      </StyledPendingBody>
    </Card>
  );
};
