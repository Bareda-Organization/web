"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, Textarea } from "@/shared/ui";
import { decideChangeApproval, getChangeApprovalDetail } from "../api";
import type { ChangeApprovalDetailResponseTypes, RouteStopPreviewResponseTypes } from "../types";
import {
  StyledDetailLayout,
  StyledRouteGrid,
  StyledRouteColumn,
  StyledRouteStopRow,
  StyledInfoRow,
  StyledInfoLabel,
  StyledActionRow,
} from "./ChangeApprovalDetail.styled";

type ChangeApprovalDetailProps = {
  approvalId: number;
};

const renderStop = (stop: RouteStopPreviewResponseTypes) => (
  <StyledRouteStopRow key={`${stop.seq}-${stop.stopName}`}>
    <span>
      {stop.seq}. {stop.stopName}
    </span>
    <span>{stop.eta}</span>
  </StyledRouteStopRow>
);

// §5.5 GET /staff/approvals/{id}(A-05) 상세 · §5.6 POST .../decide(A-05) — ②구간 변경
// 승인 상세(UF-M-02). 노선 비교는 F4 지도가 아니라 §5.5 route_preview 의 정류장
// 순번·ETA 목록이라 그대로 표로 그린다(지도 좌표 렌더는 하지 않는다).
export const ChangeApprovalDetail = ({ approvalId }: ChangeApprovalDetailProps) => {
  const router = useRouter();
  const [detail, setDetail] = useState<ChangeApprovalDetailResponseTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decideError, setDecideError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChangeApprovalDetail(approvalId);
      setDetail(data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "구간 변경 상세를 불러오지 못했습니다");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  useEffect(() => {
    (async () => {
      await loadDetail();
    })();
  }, [loadDetail]);

  const handleApprove = async () => {
    if (!detail) return;
    setSubmitting(true);
    setDecideError(null);
    try {
      await decideChangeApproval(approvalId, { approve: true, previewToken: detail.previewToken });
      router.push("/change-approval");
    } catch (cause) {
      // 409 PREVIEW_STALE 은 조회 시점 재최적화가 낡았다는 뜻이라, 새 미리보기를 다시
      // 받아 오는 것이 유일한 복구 경로다(§5.6 주석).
      setDecideError(cause instanceof ApiError ? cause.message : "승인 처리에 실패했습니다");
      if (cause instanceof ApiError && cause.code === "PREVIEW_STALE") {
        loadDetail();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    setDecideError(null);
    try {
      await decideChangeApproval(approvalId, { approve: false, rejectReason: rejectReason.trim() });
      router.push("/change-approval");
    } catch (cause) {
      setDecideError(cause instanceof ApiError ? cause.message : "거절 처리에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StyledDetailLayout>
        <PageHeader title="구간 변경 승인" description="불러오는 중..." />
      </StyledDetailLayout>
    );
  }

  if (!detail) {
    return (
      <StyledDetailLayout>
        <PageHeader title="구간 변경 승인" />
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDetailLayout>
    );
  }

  return (
    <StyledDetailLayout>
      <PageHeader
        title={`${detail.studentName} 구간 변경`}
        description={`처리 기한 ${detail.deadlineAt}`}
      />

      {detail.previewStale ? (
        <AlertBanner tone="missed" title="미리보기가 최신이 아닙니다 — 새로고침 후 다시 확인하세요" />
      ) : null}
      {decideError ? <AlertBanner tone="missed" title={decideError} /> : null}

      <Card>
        <StyledInfoRow>
          <StyledInfoLabel>버스</StyledInfoLabel>
          <span>{detail.busNo}</span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>승하차지</StyledInfoLabel>
          <span>
            {detail.stopName} {detail.willRemoveStop ? <Badge tone="removed">삭제 예정</Badge> : null}
          </span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>잔여 인원</StyledInfoLabel>
          <span>{detail.remainingRiders}</span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>정원</StyledInfoLabel>
          <span>
            {detail.capacity.assigned}/{detail.capacity.studentCapacity}
          </span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>예상 소요</StyledInfoLabel>
          <span>
            {detail.estTimeBefore} → {detail.estTimeAfter}
          </span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>영향받는 학생</StyledInfoLabel>
          <span>{detail.affectedStudents.map((s) => s.name).join(", ") || "-"}</span>
        </StyledInfoRow>
      </Card>

      <Card>
        <p>노선 비교</p>
        <StyledRouteGrid>
          <StyledRouteColumn>
            <p>변경 전</p>
            {detail.routePreview.stopsBefore.map(renderStop)}
          </StyledRouteColumn>
          <StyledRouteColumn>
            <p>변경 후</p>
            {detail.routePreview.stopsAfter.map(renderStop)}
          </StyledRouteColumn>
        </StyledRouteGrid>
      </Card>

      <Card>
        {mode === "reject" ? (
          <>
            <Textarea
              label="거절 사유"
              required
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
            <StyledActionRow>
              <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
                뒤로
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={submitting || !rejectReason.trim()}>
                {submitting ? "처리 중..." : "거절 확정"}
              </Button>
            </StyledActionRow>
          </>
        ) : (
          <StyledActionRow>
            <Button variant="danger" onClick={() => setMode("reject")} disabled={submitting}>
              거절
            </Button>
            <Button variant="primary" onClick={handleApprove} disabled={submitting}>
              {submitting ? "처리 중..." : "승인"}
            </Button>
          </StyledActionRow>
        )}
      </Card>
    </StyledDetailLayout>
  );
};
