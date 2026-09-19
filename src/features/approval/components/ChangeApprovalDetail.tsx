"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, Textarea } from "@/shared/ui";
import { MapSurface, type MapCamera, type MapPolyline } from "@/features/map";
import { decideChangeApproval, getChangeApprovalDetail } from "../api";
import type {
  ChangeApprovalDetailResponseTypes,
  RoutePathPointResponseTypes,
  RouteStopPreviewResponseTypes,
} from "../types";
import {
  StyledDetailLayout,
  StyledRouteGrid,
  StyledRouteColumn,
  StyledRouteStopRow,
  StyledInfoRow,
  StyledInfoLabel,
  StyledActionRow,
  StyledMapSurface,
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

// `R18-C` 목표 3(Ruling 318) — 노선 전체 소요(분)를 전/후·증감 부호와 함께 낸다. 결정된
// 건처럼 값이 없으면(재최적화를 하지 않은 건) "-" 를 두고 왜 없는지 한 줄로 안내한다 —
// 값이 그냥 비어 있으면 결함인지 "이 건은 원래 계산하지 않는다"인지 화면에서 구별이 안 된다.
const formatDurationComparison = (before: number | null, after: number | null): string => {
  if (before === null || after === null) {
    return "- (결정된 건은 소요시간을 다시 계산하지 않습니다)";
  }
  const delta = after - before;
  const sign = delta >= 0 ? "+" : "";
  return `${before}분 → ${after}분 (${sign}${delta}분)`;
};

const DEFAULT_MAP_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// 도로 좌표열의 중심으로 지도를 잡는다 — MonitoringPage.tsx 의 mapCamera 계산과 같은 방식
// (경로 전체를 정확히 맞추는 bounds-fit 은 features/map 계약에 아직 없다).
const cameraForPath = (path: RoutePathPointResponseTypes[]): MapCamera => {
  if (path.length === 0) return DEFAULT_MAP_CAMERA;
  const sum = path.reduce((acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / path.length, lng: sum.lng / path.length, zoom: DEFAULT_MAP_CAMERA.zoom };
};

const renderRouteMap = (path: RoutePathPointResponseTypes[]) => {
  if (path.length === 0) {
    return <p>경로 좌표가 아직 없습니다</p>;
  }
  const polylines: MapPolyline[] = [{ id: "preview", points: path, kind: "route" }];
  return (
    <StyledMapSurface>
      <MapSurface camera={cameraForPath(path)} markers={[]} polylines={polylines} />
    </StyledMapSurface>
  );
};

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
    // previewToken 이 null 이면 이미 결정된 건이라(아래 isAlreadyDecided 주석 참고)
    // 승인 버튼 자체를 안 보여주지만, 방어적으로 한 번 더 막는다.
    if (!detail || !detail.previewToken) return;
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

  // 이미 결정된 건(approved·rejected·auto_rejected)은 백엔드가 재최적화를 하지 않고
  // routePreview·previewToken 등을 전부 null 로 돌려준다(api/changeApprovals.ts 주석 —
  // 2026-09-14 F5-W1 실서버 계약 시험에서 처음 드러난 계약). routePreview 유무로
  // "이미 결정됐는가"를 판정해 노선 비교·승인/거절 조작을 감춘다.
  const isAlreadyDecided = detail.routePreview === null;

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
            {detail.estTimeBefore ?? "-"} → {detail.estTimeAfter ?? "-"}
          </span>
        </StyledInfoRow>
        <StyledInfoRow>
          {/* `R18-C` 목표 2·3(Ruling 318) — 노선 전체 소요(분). 위 "예상 소요"(도착 시각)와는
              다른 값이다 — 특정 학생의 승하차지 도착 시각이 아니라 출발지→마지막 정차지 총 시간. */}
          <StyledInfoLabel>노선 전체 소요</StyledInfoLabel>
          <span>{formatDurationComparison(detail.estDurationBefore, detail.estDurationAfter)}</span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>영향받는 학생</StyledInfoLabel>
          <span>{detail.affectedStudents.map((s) => s.name).join(", ") || "-"}</span>
        </StyledInfoRow>
      </Card>

      <Card>
        <p>노선 비교</p>
        {detail.routePreview ? (
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
        ) : (
          <p>이미 결정된 건이라 노선 재계산 결과가 없습니다.</p>
        )}
      </Card>

      {detail.routePreview ? (
        <Card>
          {/* `R18-C` 목표 4(Ruling 319) — 전후 경로를 좌우 두 지도로 나란히. 한 지도에 겹치지 않는다. */}
          <p>경로 지도</p>
          <StyledRouteGrid>
            <StyledRouteColumn>
              <p>변경 전</p>
              {renderRouteMap(detail.routePreview.roadPathBefore)}
            </StyledRouteColumn>
            <StyledRouteColumn>
              <p>변경 후</p>
              {renderRouteMap(detail.routePreview.roadPathAfter)}
            </StyledRouteColumn>
          </StyledRouteGrid>
        </Card>
      ) : null}

      {isAlreadyDecided ? null : (
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
      )}
    </StyledDetailLayout>
  );
};
