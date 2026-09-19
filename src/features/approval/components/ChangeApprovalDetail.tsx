"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, Textarea } from "@/shared/ui";
import { MapSurface, type MapCamera, type MapPolyline } from "@/features/map";
import { formatClockTime } from "@/shared/lib/format/clockTime";
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

// `R20-B2` 목표 1(사용자 지적) — 실제 응답은 이 값을 풀 ISO(초·밀리초·날짜 포함)로 준다
// (같은 날 같은 회차의 정차지 시각이라 시:분이면 충분하다). 타입은 `string` 이지만 실측상
// 결정 전 정류장은 `null` 로 오기도 해(백엔드 계약과 타입이 어긋난 지점, 보고서 §2) —
// `formatClockTime` 에 그대로 넘기면 `Date(null)` 이 자정으로 파싱돼 없는 값을 있는
// 것처럼 보여준다. 값이 없을 때는 "-" 로 명시한다.
const renderStop = (stop: RouteStopPreviewResponseTypes) => (
  <StyledRouteStopRow key={`${stop.seq}-${stop.stopName}`}>
    <span>
      {stop.seq}. {stop.stopName}
    </span>
    <span>{stop.eta ? formatClockTime(stop.eta) : "-"}</span>
  </StyledRouteStopRow>
);

// `R20-B` 목표 2·3·4(조율자 결정) — "변경 전 / 변경 후" 묶음에 시간 값은 이 3개만 낸다:
// 전체 소요시간(분) · 출발시간 · 도착시간. 옛 est_time_before/after(이 학생 개인 도착시각)는
// 기준이 두 갈래로 갈리는 표를 만들어 뺐다 — 소요시간은 이미 "노선 전체(출발지→마지막
// 정차지)" 기준(Ruling 318)인데 도착시각만 "이 학생 정류장" 기준이면 관리자가 "37분
// 걸리는데 도착이 왜 저 시각이지"로 읽는다.
//
// 값이 없는 두 원인을 구별한다 — ①옛 확정 노선(`route_version.est_duration_min` 컬럼
// 도입 전)이라 소요시간 자체가 없는 경우(RunWaypointPanel.tsx 와 같은 문구),
// ②`departTime` 이 아직 응답에 없는 경우(`r20-a` 미병합, api/changeApprovals.ts 주석).
// "-" 만 찍으면 결함인지 아직 안 채워진 값인지 화면에서 구별이 안 된다.
const DURATION_MISSING_REASON = "- (예전 확정 노선이라 소요시간 정보가 없습니다)";
const DEPART_TIME_MISSING_REASON = "- (출발 시각 정보가 아직 없습니다)";
const ARRIVAL_TIME_MISSING_REASON = "- (출발 또는 소요 정보가 없어 계산할 수 없습니다)";

// 전체 소요시간 — "변경 전" 열은 값만, "변경 후" 열은 증감 부호를 덧붙인다(목표 4, 증감 유지).
const formatTotalDuration = (minutes: number | null, deltaBase?: number | null): string => {
  if (minutes === null) return DURATION_MISSING_REASON;
  if (deltaBase === undefined || deltaBase === null) return `${minutes}분`;
  const delta = minutes - deltaBase;
  const sign = delta >= 0 ? "+" : "";
  return `${minutes}분 (${sign}${delta}분)`;
};

// 출발시간 — 재최적화가 출발 시각 자체를 옮기지 않으므로 전/후 두 열에 같은 값이 들어간다
// (조율자 결정 — "변경해도 출발 시각은 그대로"가 관리자에게 유용한 정보다). `R20-B2`
// 목표 2 — 값만 같으면 사람은 버그로 읽는다(사용자 신고). 렌더 쪽에서 "전후 동일"
// 배지를 나란히 붙여 의도된 동일값임을 밝힌다(아래 return 문).
const formatDepartTime = (departTime: string | null): string =>
  departTime === null ? DEPART_TIME_MISSING_REASON : formatClockTime(departTime);

// 도착시간 — 새로 계산하지 않고 출발시간 + 전체 소요시간(분)의 파생값이다.
const formatArrivalTime = (departTime: string | null, durationMin: number | null): string => {
  if (departTime === null || durationMin === null) return ARRIVAL_TIME_MISSING_REASON;
  const arrival = new Date(departTime);
  arrival.setMinutes(arrival.getMinutes() + durationMin);
  return formatClockTime(arrival.toISOString());
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
        description={`처리 기한 ${formatClockTime(detail.deadlineAt)}`}
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
          <StyledInfoLabel>영향받는 학생</StyledInfoLabel>
          <span>{detail.affectedStudents.map((s) => s.name).join(", ") || "-"}</span>
        </StyledInfoRow>
      </Card>

      {detail.routePreview ? (
        <Card>
          {/* `R20-B` 목표 2·3·4(조율자 결정) — 전/후를 나란히 두 열로 나눠 무엇이 달라지는지
              바로 보이게 한다. 시간은 전체 소요시간·출발시간·도착시간 3개만 낸다. */}
          <p>소요 시간</p>
          <StyledRouteGrid>
            <StyledRouteColumn>
              <p>변경 전</p>
              <StyledInfoRow>
                <StyledInfoLabel>전체 소요시간</StyledInfoLabel>
                <span>{formatTotalDuration(detail.estDurationBefore)}</span>
              </StyledInfoRow>
              <StyledInfoRow>
                <StyledInfoLabel>출발시간</StyledInfoLabel>
                <span>
                  <span>{formatDepartTime(detail.departTime)}</span> <Badge tone="neutral">전후 동일</Badge>
                </span>
              </StyledInfoRow>
              <StyledInfoRow>
                <StyledInfoLabel>도착시간</StyledInfoLabel>
                <span>{formatArrivalTime(detail.departTime, detail.estDurationBefore)}</span>
              </StyledInfoRow>
            </StyledRouteColumn>
            <StyledRouteColumn>
              <p>변경 후</p>
              <StyledInfoRow>
                <StyledInfoLabel>전체 소요시간</StyledInfoLabel>
                <span>{formatTotalDuration(detail.estDurationAfter, detail.estDurationBefore)}</span>
              </StyledInfoRow>
              <StyledInfoRow>
                <StyledInfoLabel>출발시간</StyledInfoLabel>
                <span>
                  <span>{formatDepartTime(detail.departTime)}</span> <Badge tone="neutral">전후 동일</Badge>
                </span>
              </StyledInfoRow>
              <StyledInfoRow>
                <StyledInfoLabel>도착시간</StyledInfoLabel>
                <span>{formatArrivalTime(detail.departTime, detail.estDurationAfter)}</span>
              </StyledInfoRow>
            </StyledRouteColumn>
          </StyledRouteGrid>
        </Card>
      ) : null}

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
