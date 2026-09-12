"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, Input, SegmentedControl } from "@/shared/ui";
import { addRunWaypoint, removeRunWaypoint } from "../api";
import type { WaypointResultResponseTypes } from "../types";
import {
  StyledWaypointActionsRow,
  StyledWaypointCompare,
  StyledWaypointCompareCol,
  StyledWaypointDeployedRow,
  StyledWaypointInputRow,
  StyledWaypointPanel,
} from "./RunWaypointPanel.styled";

type AddressMode = "address" | "coords";

// §5.15 POST·DELETE /staff/runs/{runId}/waypoints(RTE-10, A-15) — 확정 노선에 강제
// 경유지를 지정한다. §5.9 의 정차지 관리와 달리 이쪽은 apply=false(미리보기)→
// apply=true(배포) 2단계가 API 자체에 있어, 그 구조를 그대로 화면 흐름으로 옮긴다
// (ForcedAddDialog 의 "확인용 재진술" 확인창과 다르다 — 여기 미리보기는 서버가 실제로
// 계산한 전후 비교다).
//
// runId 를 직접 입력받는다 — 오늘 회차를 조회하는 카탈로그가 이 화면에 없다(§2 확신
// 없는 지점, RouteStopsPanel 의 stop_id 입력과 같은 성격의 사양 공백).
// 배포된 waypoint_id 목록도 서버 조회 수단이 없어(목록 엔드포인트 부재) 이 화면에서
// 배포에 성공한 것만 세션 동안 기억해 제거 입력칸에 이어 쓴다.
export const RunWaypointPanel = () => {
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
          <StyledWaypointInputRow>
            <Input
              label="회차 ID"
              value={runIdInput}
              onChange={(event) => setRunIdInput(event.target.value)}
              placeholder="run_id"
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
            <Input label="회차 ID" value={removeRunId} onChange={(event) => setRemoveRunId(event.target.value)} />
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
