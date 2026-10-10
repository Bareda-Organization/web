"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, Dialog, PageHeader, StatStrip, StatusChip, Textarea, useToast } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import { MapSurface, type MapCamera, type MapMarker, type MapPolyline } from "@/features/map";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { decideChangeApproval, getChangeApprovalDetail } from "../api";
import { toDecideFailure } from "../lib/decideErrorMessage";
import { formatRemaining, useNowEverySecond } from "../lib/remainingTime";
import { useApprovalPending } from "./ApprovalPendingProvider";
import type {
  ChangeApprovalDetailResponseTypes,
  RoutePathPointResponseTypes,
  RouteStopPreviewResponseTypes,
  RouteStopRefResponseTypes,
} from "../types";
import {
  StyledDetailLayout,
  StyledRouteGrid,
  StyledRouteColumn,
  StyledRouteStopRow,
  StyledInfoRow,
  StyledInfoLabel,
  StyledBreadcrumb,
  StyledMapSurface,
} from "./ChangeApprovalDetail.styled";

type ChangeApprovalDetailProps = {
  approvalId: string;
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
const DISTANCE_MISSING_REASON = "- (거리 정보가 없습니다)";
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

// 예상 거리(km, §5.5 est_distance_*) — 소요시간과 같은 꼴로 "변경 후" 열에만 증감을 덧붙인다(A-05 · UF-M-02).
const formatDistance = (km: number | null, deltaBase?: number | null): string => {
  if (km === null) return DISTANCE_MISSING_REASON;
  if (deltaBase === undefined || deltaBase === null) return `${km.toFixed(1)}km`;
  const delta = km - deltaBase;
  return `${km.toFixed(1)}km (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}km)`;
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

// R21-A 추가 지시 ② — "변한 승하차지"(삭제·순서 변경)의 stopName 집합. stops_before·
// stops_after 는 stopId 를 안 실어(§5.5 계약 — 이름만으로 충분하다는 기존 판단)
// 이름으로 맞춘다 — 이 화면이 이미 정차지 표(renderStop)에서 쓰는 것과 같은 키다.
const changedStopNamesOf = (reordered: RouteStopRefResponseTypes[], removed: RouteStopRefResponseTypes[]): Set<string> =>
  new Set(
    [...reordered, ...removed].map((ref) => ref.stopName).filter((name): name is string => name != null),
  );

// R21-A 추가 지시 ② — 정차지를 지도 마커로 바꾼다. 좌표가 없는 항목(경유 지점만
// 가리키는 자리)은 건너뛴다 — 억지로 좌표를 맞추면 삭제된 승하차지가 조용히
// 빠진 지도가 나간다(조율자 지시).
const stopsToMarkers = (stops: RouteStopPreviewResponseTypes[], changedNames: Set<string>): MapMarker[] =>
  stops
    .filter((stop) => stop.lat != null && stop.lng != null)
    .map((stop) => ({
      id: `stop-${stop.seq}-${stop.stopName}`,
      lat: stop.lat as number,
      lng: stop.lng as number,
      kind: "stop" as const,
      seq: stop.seq,
      selected: changedNames.has(stop.stopName),
    }));

// 도로 좌표가 비어도(옛 확정 노선 버전) 정차지 마커는 있을 수 있다 — 그때는 정차지
// 평균 좌표로 카메라를 잡는다(R21-A §4 와 같은 판단, features/map 의 anchorForSelection
// 과 같은 이유 — 화면이 SDK 를 몰라야 하므로 여기서 직접 평균만 낸다).
const cameraForPathOrMarkers = (path: RoutePathPointResponseTypes[], markers: MapMarker[]): MapCamera => {
  if (path.length > 0) return cameraForPath(path);
  if (markers.length === 0) return DEFAULT_MAP_CAMERA;
  const sum = markers.reduce((acc, marker) => ({ lat: acc.lat + marker.lat, lng: acc.lng + marker.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / markers.length, lng: sum.lng / markers.length, zoom: DEFAULT_MAP_CAMERA.zoom };
};

const renderRouteMap = (path: RoutePathPointResponseTypes[], markers: MapMarker[]) => {
  if (path.length === 0 && markers.length === 0) {
    return <p>경로 좌표가 아직 없습니다</p>;
  }
  const polylines: MapPolyline[] = path.length > 0 ? [{ id: "preview", points: path, kind: "route" }] : [];
  return (
    <StyledMapSurface>
      <MapSurface camera={cameraForPathOrMarkers(path, markers)} markers={markers} polylines={polylines} />
    </StyledMapSurface>
  );
};

// §5.5 GET /staff/approvals/{id}(A-05) 상세 · §5.6 POST .../decide(A-05) — ②구간 변경
// 승인 상세(UF-M-02). 노선 비교는 F4 지도가 아니라 §5.5 route_preview 의 정류장
// 순번·ETA 목록이라 그대로 표로 그린다(지도 좌표 렌더는 하지 않는다).
export const ChangeApprovalDetail = ({ approvalId }: ChangeApprovalDetailProps) => {
  const router = useRouter();
  const { refresh: refreshPending } = useApprovalPending();
  const [detail, setDetail] = useState<ChangeApprovalDetailResponseTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decideError, setDecideError] = useState<string | null>(null);
  const now = useNowEverySecond();
  const { show } = useToast();

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
      show({ title: `${detail.studentName} 구간 변경을 승인했습니다`, detail: "노선을 다시 확정해 기사·동승자에게 재배포하고 학부모에게 알립니다" });
      void refreshPending();
      router.push("/change-approval");
    } catch (cause) {
      // 예전 화면이라 거절된 경우(이미 결정됨·기한 경과·명단 이탈·낡은 미리보기)는 새로 불러와 최신 상태를 따른다.
      const failure = toDecideFailure(cause, "승인 처리에 실패했습니다");
      setDecideError(failure.message);
      if (failure.shouldReload) loadDetail();
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
      void refreshPending();
      router.push("/change-approval");
    } catch (cause) {
      const failure = toDecideFailure(cause, "거절 처리에 실패했습니다");
      setDecideError(failure.message);
      if (failure.shouldReload) loadDetail();
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
        {error ? (
          <AlertBanner
            tone="missed"
            title={error}
            action={
              <Button size="sm" variant="secondary" onClick={loadDetail}>
                다시 불러오기
              </Button>
            }
          />
        ) : null}
      </StyledDetailLayout>
    );
  }

  // 이미 결정된 건(approved·rejected·auto_rejected)은 백엔드가 재최적화를 하지 않고
  // routePreview·previewToken 등을 전부 null 로 돌려준다(api/changeApprovals.ts 주석 —
  // 2026-09-14 F5-W1 실서버 계약 시험에서 처음 드러난 계약). routePreview 유무로
  // "이미 결정됐는가"를 판정해 노선 비교·승인/거절 조작을 감춘다.
  const isAlreadyDecided = detail.routePreview === null;
  const remaining = formatRemaining(new Date(detail.deadlineAt).getTime(), now);
  // 서버는 처리 기한에 대기 건을 자동 거절한다(Ruling 306, API_SPEC §9.6) — 기한이 지난 대기 건은
  // 눌러도 소용이 없어 조작을 끈다. `now` 가 1초마다 갱신돼 화면을 열어 둔 채 넘겨도 바뀐다.
  const isExpired = !isAlreadyDecided && remaining === null;
  // 승인은 노선 재확정·승하차지 삭제를 일으키고 되돌릴 수 없다 — 가입 승인·거절처럼 확인 단계를 한 번 둔다(F02-14).
  const removedStopCount = detail.routePreview?.removed.length ?? 0;
  const approveConfirmText =
    removedStopCount > 0 ? `이 변경을 승인합니다 (삭제 예정 승하차지 ${removedStopCount}곳)` : "이 변경을 승인합니다";

  const directionLabel = detail.direction === "to_academy" ? "등원" : "하원";
  const crew = [detail.driverName ? `기사 ${detail.driverName}` : null, detail.escortName ? `동승 ${detail.escortName}` : null].filter(Boolean).join(" · ");
  const canDecide = !isAlreadyDecided && !isExpired;
  const route = detail.routePreview;

  // 바뀌는 것 4칸 — 무엇이 바뀌고 정원은 괜찮은가를 첫 화면에 둔다. 값은 §5.5 응답에서 계산한다(새 필드 없음).
  const summaryItems: StatStripItem[] = route
    ? [
        {
          label: "삭제될 승하차지",
          value: route.removed.length,
          unit: "곳",
          tone: route.removed.length > 0 ? "bad" : "neutral",
          detail: route.removed.length > 0 ? `${route.removed.map((ref) => ref.stopName).join(" · ")}\n잔여 인원 ${detail.remainingRiders}명` : "삭제되는 승하차지가 없습니다",
        },
        {
          label: "순서가 바뀌는 승하차지",
          value: route.reordered.length,
          unit: "곳",
          detail: route.reordered.length > 0 ? `${route.reordered.map((ref) => ref.stopName).join(" · ")}\n재계산 결과` : "순서가 바뀌는 승하차지가 없습니다",
        },
        {
          label: "전체 소요 시간",
          value: detail.estDurationBefore !== null && detail.estDurationAfter !== null ? `${detail.estDurationBefore} → ${detail.estDurationAfter}` : "-",
          unit: "분",
          detail:
            detail.estDurationBefore !== null && detail.estDurationAfter !== null
              ? `${detail.estDurationAfter - detail.estDurationBefore >= 0 ? "+" : ""}${detail.estDurationAfter - detail.estDurationBefore}분 · 출발 ${detail.departTime ? formatClockTime(detail.departTime) : "-"} 변경 없음`
              : "예전 확정 노선이라 소요시간 정보가 없습니다",
        },
        {
          label: "정원",
          value: `${detail.capacity.assigned}/${detail.capacity.studentCapacity}`,
          unit: "명",
          detail: `현재 탑승 인원 · 영향 학생 ${detail.affectedStudents.length}명`,
        },
      ]
    : [];

  return (
    <StyledDetailLayout>
      <StyledBreadcrumb aria-label="경로">
        <Link href="/change-approval">구간 변경 승인</Link>
        <span aria-hidden="true">›</span>
        <span>{detail.studentName}</span>
      </StyledBreadcrumb>
      <PageHeader
        title={`${detail.studentName} 구간 변경`}
        description={`${detail.busNo} · ${directionLabel}${detail.departTime ? ` · ${formatClockTime(detail.departTime)} 출발` : ""} — ${
          isAlreadyDecided ? "이미 결정된 건입니다" : `승인하면 노선을 다시 확정해 ${crew || "기사·동승자"}에게 재배포하고 학부모에게 알립니다`
        }`}
        actions={
          isAlreadyDecided ? null : (
            <>
              <Button variant="dangerQuiet" onClick={() => setMode("reject")} disabled={submitting || isExpired}>
                거절
              </Button>
              <Button variant="primary" icon="circle-check" onClick={() => setMode("approve")} disabled={submitting || isExpired}>
                승인
              </Button>
            </>
          )
        }
      />

      {isAlreadyDecided ? (
        <AlertBanner
          tone={detail.status === "approved" ? "boarded" : detail.status === "rejected" ? "missed" : "moving"}
          title={
            detail.status === "approved"
              ? "승인 완료 — 노선이 다시 확정되었습니다"
              : detail.status === "rejected"
                ? "거절됨 — 기존 노선이 유지되었습니다"
                : detail.status === "auto_rejected"
                  ? "자동 거절됨 — 처리 기한이 지나 기존 노선이 유지되었습니다"
                  : "이미 결정된 건입니다"
          }
        >
          {[detail.decidedAt ? formatDateTime(detail.decidedAt) : null, detail.decidedByName ? `처리자 ${detail.decidedByName}` : null].filter(Boolean).join(" · ")}
        </AlertBanner>
      ) : (
        <AlertBanner tone={isExpired ? "missed" : "moving"} title={isExpired ? "처리 기한이 지나 자동 거절됩니다" : `처리 기한 ${formatClockTime(detail.deadlineAt)} — 남은 시간 ${remaining}`}>
          기한이 지나면 자동 거절되어 기존 노선이 유지되고, 학부모에게 실패가 통지됩니다.
        </AlertBanner>
      )}

      {detail.previewStale ? (
        <AlertBanner
          tone="missed"
          title="미리보기가 최신이 아닙니다 — 다시 불러온 뒤 확인하세요"
          action={
            <Button size="sm" variant="secondary" onClick={loadDetail}>
              다시 불러오기
            </Button>
          }
        />
      ) : null}
      {decideError ? <AlertBanner tone="missed" title={decideError} /> : null}

      {summaryItems.length > 0 ? <StatStrip items={summaryItems} style={{ whiteSpace: "pre-line" }} /> : null}

      <Card>
        <p>요청 내용</p>
        <StyledInfoRow>
          <StyledInfoLabel>학생</StyledInfoLabel>
          <span>{detail.studentName}</span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>요청 유형</StyledInfoLabel>
          <span>{detail.source === "intent" ? "등하원 토글" : "일일 스케줄 변경"}</span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>버스</StyledInfoLabel>
          <span>{detail.busNo}</span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>승하차지</StyledInfoLabel>
          <span>
            {detail.stopName} {detail.willRemoveStop ? <StatusChip tone="bad">삭제 예정</StatusChip> : null}
          </span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>잔여 인원</StyledInfoLabel>
          <span>
            {detail.remainingRiders}명{detail.willRemoveStop ? " — 이 승하차지에 남는 학생이 없음" : ""}
          </span>
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
        <StyledInfoRow>
          <StyledInfoLabel>접수</StyledInfoLabel>
          <span>{formatClockTime(detail.requestedAt)} · {detail.source === "intent" ? "등하원 토글" : "학부모 신청"}</span>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>처리 기한</StyledInfoLabel>
          <span>{formatClockTime(detail.deadlineAt)} (출발 10분 뒤 또는 운행 시작 중 먼저 오는 때){remaining === null ? " — 처리 기한이 지났습니다" : ""}</span>
        </StyledInfoRow>
      </Card>

      {detail.routePreview ? (
        <Card>
          {/* `R20-B` 목표 2·3·4(조율자 결정) — 전/후를 나란히 두 열로 나눠 무엇이 달라지는지
              바로 보이게 한다. 시간은 전체 소요시간·출발시간·도착시간, 거리는 예상 거리(S7)를 낸다. */}
          <p>소요 시간</p>
          <StyledRouteGrid>
            <StyledRouteColumn>
              <p>변경 전</p>
              <StyledInfoRow>
                <StyledInfoLabel>전체 소요시간</StyledInfoLabel>
                <span>{formatTotalDuration(detail.estDurationBefore)}</span>
              </StyledInfoRow>
              <StyledInfoRow>
                <StyledInfoLabel>예상 거리</StyledInfoLabel>
                <span>{formatDistance(detail.estDistanceBefore)}</span>
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
                <StyledInfoLabel>예상 거리</StyledInfoLabel>
                <span>{formatDistance(detail.estDistanceAfter, detail.estDistanceBefore)}</span>
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
          {/* `R18-C` 목표 4(Ruling 319) — 전후 경로를 좌우 두 지도로 나란히. 한 지도에 겹치지 않는다.
              R21-A 추가 지시 ② — 승하차지도 마커로 찍고, 삭제·순서 변경된 것은 흰 테두리로 강조한다. */}
          <p>경로 지도</p>
          <StyledRouteGrid>
            <StyledRouteColumn>
              <p>변경 전</p>
              {renderRouteMap(
                detail.routePreview.roadPathBefore,
                stopsToMarkers(
                  detail.routePreview.stopsBefore,
                  changedStopNamesOf(detail.routePreview.reordered, detail.routePreview.removed),
                ),
              )}
            </StyledRouteColumn>
            <StyledRouteColumn>
              <p>변경 후</p>
              {renderRouteMap(
                detail.routePreview.roadPathAfter,
                stopsToMarkers(
                  detail.routePreview.stopsAfter,
                  changedStopNamesOf(detail.routePreview.reordered, detail.routePreview.removed),
                ),
              )}
            </StyledRouteColumn>
          </StyledRouteGrid>
        </Card>
      ) : null}

      {/* 승인은 노선 재확정·승하차지 삭제를 일으키고 되돌릴 수 없다 — 영향을 한 번 더 보여 주는 확인 대화상자(U-04 · F02-14). */}
      <Dialog
        open={canDecide && mode === "approve"}
        title={`${detail.studentName} 구간 변경 승인`}
        showClose
        onClose={() => setMode(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
              뒤로
            </Button>
            <Button variant="danger" onClick={handleApprove} disabled={submitting || isExpired}>
              {submitting ? "처리 중..." : "구간 변경 승인"}
            </Button>
          </>
        }
      >
        <p>{approveConfirmText}</p>
        <p>승인하면 노선을 다시 확정해 {crew || "기사·동승자"}에게 재배포하고 학부모에게 알립니다. 되돌릴 수 없습니다.</p>
      </Dialog>
      <Dialog
        open={canDecide && mode === "reject"}
        title={`${detail.studentName} 구간 변경 거절`}
        showClose
        onClose={() => setMode(null)}
        actionHint={rejectReason.trim() ? undefined : "사유를 입력하면 [구간 변경 거절] 버튼이 켜집니다."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
              뒤로
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={submitting || isExpired || !rejectReason.trim()}>
              {submitting ? "처리 중..." : "구간 변경 거절"}
            </Button>
          </>
        }
      >
        <Textarea label="거절 사유" required maxLength={200} hint="학부모에게 그대로 전달됩니다 · 학생 이름·연락처는 적지 마세요" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
      </Dialog>
    </StyledDetailLayout>
  );
};
