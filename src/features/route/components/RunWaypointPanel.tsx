"use client";

import { useEffect, useState } from "react";
import { getRuns } from "@/features/schedule";
import type { RunItemResponseTypes } from "@/features/schedule";
import { ApiError } from "@/shared/lib/http";
import { formatDurationDelta } from "@/shared/lib/format/durationDelta";
import { AlertBanner, Button, Card, Input, SegmentedControl, Select } from "@/shared/ui";
import { addRunWaypoint, removeRunWaypoint } from "../api";
import type { RunDirection, WaypointResultResponseTypes } from "../types";
import {
  StyledWaypointActionsRow,
  StyledWaypointCompare,
  StyledWaypointCompareCol,
  StyledWaypointDeployedRow,
  StyledWaypointInputRow,
  StyledWaypointPanel,
} from "./RunWaypointPanel.styled";

type AddressMode = "address" | "coords";

type RunWaypointPanelProps = {
  busId: number;
  direction: RunDirection;
};

// §5.15 POST·DELETE /staff/runs/{runId}/waypoints(RTE-10, A-15) — 확정 노선에 강제
// 경유지를 지정한다. §5.9 의 정차지 관리와 달리 이쪽은 apply=false(미리보기)→
// apply=true(배포) 2단계가 API 자체에 있어, 그 구조를 그대로 화면 흐름으로 옮긴다
// (ForcedAddDialog 의 "확인용 재진술" 확인창과 다르다 — 여기 미리보기는 서버가 실제로
// 계산한 전후 비교다).
//
// FE-R3 W3 목표 9 판정 ① — 사양 공백이 아니라 화면 설계 문제였다. GET
// /staff/runs?service_date=(SCH-02, §5.10) 가 이미 있고 생략하면 오늘 날짜를 준다.
// 부모(RouteDetail)가 이미 들고 있는 busId·direction 을 받아 오늘 회차 중 이 노선과
// 같은 호차·방향만 골라 드롭다운으로 준다 — 손으로 run_id 를 치던 것을 없앤다.
// (RouteStopsPanel 의 stop_id 입력은 같은 형태지만 이 라운드의 판정 대상이 아니다 — 목
// 록 조회 엔드포인트가 사양에 없어 그대로 둔다.)
//
// 목표 9 판정 ② — 이쪽은 진짜 사양 공백이다. 배포된 경유 지점(waypoint_id)을 조회하는
// 엔드포인트가 API_SPEC 어디에도 없다(§5.19 GET .../route 의 stops[].stop_id 는
// run_stop.id 이고 waypoint.id 와 다른 값이다, ERD.md waypoint·run_stop 테이블 확인).
// POST·DELETE 응답이 그 값을 그때만 돌려주므로, 이 화면에서 배포에 성공한 것만 세션
// 동안 기억해 제거 입력칸에 이어 쓰는 지금 방식이 이 라운드에서 고를 수 있는 최선이다
// — 새 엔드포인트를 만들지 않는다(브리프 지시). 조율자에게 목록 엔드포인트 신설을
// 올린다(보고서 §1 참고).
export const RunWaypointPanel = ({ busId, direction }: RunWaypointPanelProps) => {
  const [runs, setRuns] = useState<RunItemResponseTypes[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runIdInput, setRunIdInput] = useState("");
  const [mode, setMode] = useState<AddressMode>("address");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<WaypointResultResponseTypes | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<{ waypointId: number; label: string }[]>([]);

  const [removeRunId, setRemoveRunId] = useState("");
  const [removeWaypointId, setRemoveWaypointId] = useState("");
  const [removePreview, setRemovePreview] = useState<WaypointResultResponseTypes | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await getRuns();
        setRuns(
          result.items.filter(
            (run) => run.busId === busId && run.direction === direction && run.canceledAt === null,
          ),
        );
        setRunsError(null);
      } catch (cause) {
        setRunsError(cause instanceof ApiError ? cause.message : "오늘 회차 목록을 불러오지 못했습니다");
      }
    })();
  }, [busId, direction]);

  const runOptions = [
    { value: "", label: runs.length > 0 ? "회차를 선택하세요" : "오늘 회차 없음" },
    ...runs.map((run) => ({ value: String(run.id), label: `#${run.id} · ${run.departTime} · ${run.status}` })),
  ];

  const runId = Number(runIdInput);
  const canPreview =
    Number.isInteger(runId) &&
    runId > 0 &&
    label.trim().length > 0 &&
    (mode === "address" ? address.trim().length > 0 : lat.trim().length > 0 && lng.trim().length > 0);

  const buildRequest = (apply: boolean) => ({
    address: mode === "address" ? address.trim() : undefined,
    lat: mode === "coords" ? Number(lat) : undefined,
    lng: mode === "coords" ? Number(lng) : undefined,
    label: label.trim(),
    note: note.trim() || undefined,
    apply,
  });

  const handlePreview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await addRunWaypoint(runId, buildRequest(false));
      setPreview(result);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "미리보기에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeploy = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await addRunWaypoint(runId, buildRequest(true));
      setDeployed([...deployed, { waypointId: result.waypointId, label: label.trim() }]);
      setPreview(result);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "배포에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const removeRunIdNum = Number(removeRunId);
  const removeWaypointIdNum = Number(removeWaypointId);
  const canRemove =
    Number.isInteger(removeRunIdNum) &&
    removeRunIdNum > 0 &&
    Number.isInteger(removeWaypointIdNum) &&
    removeWaypointIdNum > 0;

  const handleRemovePreview = async () => {
    setRemoveSubmitting(true);
    setRemoveError(null);
    try {
      const result = await removeRunWaypoint(removeRunIdNum, removeWaypointIdNum, false);
      setRemovePreview(result);
    } catch (cause) {
      setRemoveError(cause instanceof ApiError ? cause.message : "제거 미리보기에 실패했습니다");
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const handleRemoveDeploy = async () => {
    setRemoveSubmitting(true);
    setRemoveError(null);
    try {
      const result = await removeRunWaypoint(removeRunIdNum, removeWaypointIdNum, true);
      setRemovePreview(result);
      setDeployed(deployed.filter((item) => item.waypointId !== removeWaypointIdNum));
    } catch (cause) {
      setRemoveError(cause instanceof ApiError ? cause.message : "제거 배포에 실패했습니다");
    } finally {
      setRemoveSubmitting(false);
    }
  };

  return (
    <StyledWaypointPanel>
      <Card padding={16}>
        <StyledWaypointPanel>
          <p>운행 회차 경유 지점 추가</p>
          {runsError ? <AlertBanner tone="missed" title={runsError} /> : null}
          <StyledWaypointInputRow>
            <Select
              label="회차"
              value={runIdInput}
              onChange={(event) => setRunIdInput(event.target.value)}
              options={runOptions}
            />
            <Input label="표시명" value={label} onChange={(event) => setLabel(event.target.value)} />
            <Input label="메모" value={note} onChange={(event) => setNote(event.target.value)} />
          </StyledWaypointInputRow>

          <SegmentedControl
            options={[
              { value: "address", label: "주소로 입력" },
              { value: "coords", label: "좌표로 입력" },
            ]}
            value={mode}
            onChange={(value) => setMode(value as AddressMode)}
          />

          {mode === "address" ? (
            <Input label="주소" value={address} onChange={(event) => setAddress(event.target.value)} />
          ) : (
            <StyledWaypointInputRow>
              <Input label="위도" value={lat} onChange={(event) => setLat(event.target.value)} />
              <Input label="경도" value={lng} onChange={(event) => setLng(event.target.value)} />
            </StyledWaypointInputRow>
          )}

          {error ? <AlertBanner tone="missed" title={error} /> : null}

          {preview ? (
            <StyledWaypointCompare>
              <StyledWaypointCompareCol>
                <strong>변경 전</strong>
                <span>정차 {preview.routePreview.stopsBefore.length}곳</span>
                <span>예상 시간 {preview.estTimeBefore}</span>
                <span>예상 거리 {preview.estDistanceBefore}</span>
              </StyledWaypointCompareCol>
              <StyledWaypointCompareCol>
                <strong>변경 후</strong>
                <span>정차 {preview.routePreview.stopsAfter.length}곳</span>
                <span>예상 시간 {preview.estTimeAfter}</span>
                <span>예상 거리 {preview.estDistanceAfter}</span>
              </StyledWaypointCompareCol>
            </StyledWaypointCompare>
          ) : null}
          {/* `R18-C2` 목표 3(Ruling 318) — 노선 전체 소요(분)를 §5.5 상세와 같은 형태로. 옛 확정
              노선 버전은 이 컬럼이 없을 수 있어(WaypointResponse.java 주석) 값이 없으면 이유를 적는다.
              라벨과 값을 별도 엘리먼트로 둔다 — 한 노드에 합치면 화면 검사가 값만 정확히 집어낼 수 없다. */}
          {preview ? (
            <StyledWaypointDeployedRow>
              <span>노선 전체 소요</span>
              <span>
                {preview.estDurationBefore !== null && preview.estDurationAfter !== null
                  ? formatDurationDelta(preview.estDurationBefore, preview.estDurationAfter)
                  : "- (옛 확정 노선 버전이라 소요시간 값이 없습니다)"}
              </span>
            </StyledWaypointDeployedRow>
          ) : null}

          <StyledWaypointActionsRow>
            <Button variant="secondary" disabled={!canPreview || submitting} onClick={handlePreview}>
              미리보기
            </Button>
            <Button variant="danger" disabled={!preview || submitting} onClick={handleDeploy}>
              {submitting ? "처리 중..." : "배포 (기사·동승자 즉시 통지)"}
            </Button>
          </StyledWaypointActionsRow>
        </StyledWaypointPanel>
      </Card>

      <Card padding={16}>
        <StyledWaypointPanel>
          <p>배포된 경유 지점 제거</p>
          {deployed.length > 0 ? (
            <p>
              이 화면에서 배포한 경유 지점:{" "}
              {deployed.map((item) => `${item.label}(#${item.waypointId})`).join(", ")}
            </p>
          ) : (
            <p>목록 조회 수단이 없어(§2 확신 없는 지점) 이 화면에서 배포한 것만 기억합니다.</p>
          )}
          <StyledWaypointInputRow>
            <Select
              label="회차"
              value={removeRunId}
              onChange={(event) => setRemoveRunId(event.target.value)}
              options={runOptions}
            />
            <Input
              label="경유 지점 ID"
              value={removeWaypointId}
              onChange={(event) => setRemoveWaypointId(event.target.value)}
            />
          </StyledWaypointInputRow>

          {removeError ? <AlertBanner tone="missed" title={removeError} /> : null}

          {removePreview ? (
            <StyledWaypointDeployedRow>
              <span>제거 후 정차 {removePreview.routePreview.stopsAfter.length}곳</span>
              <span>{removePreview.applied ? "배포됨" : "미리보기"}</span>
            </StyledWaypointDeployedRow>
          ) : null}

          <StyledWaypointActionsRow>
            <Button variant="secondary" disabled={!canRemove || removeSubmitting} onClick={handleRemovePreview}>
              제거 미리보기
            </Button>
            <Button variant="danger" disabled={!removePreview || removeSubmitting} onClick={handleRemoveDeploy}>
              {removeSubmitting ? "처리 중..." : "제거 확정"}
            </Button>
          </StyledWaypointActionsRow>
        </StyledWaypointPanel>
      </Card>
    </StyledWaypointPanel>
  );
};
