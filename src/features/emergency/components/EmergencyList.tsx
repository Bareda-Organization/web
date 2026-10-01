"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { usePolling } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, Input, PageHeader, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { ackEmergency, getEmergencies } from "../api";
import { EMERGENCY_ROLE_LABEL, EMERGENCY_TYPE_LABEL } from "../lib/emergencyLabels";
import { emergencyMapUrl } from "../lib/mapLink";
import type { EmergencyItemResponseTypes, EmergencyStatus } from "../types";
import { EmergencyDetailDialog } from "./EmergencyDetailDialog";
import { StyledEmergencyFilters, StyledEmergencyLayout, StyledEmergencyPosition } from "./EmergencyList.styled";
import { RECENT_LIST_CAP } from "@/shared/lib/format/listCap";

// 메인 관리자 화면(EmergencyAlertsPage)과 같은 주기.
const EMERGENCY_POLL_INTERVAL_MS = 5000;

const STATUS_OPTIONS: { value: EmergencyStatus; label: string }[] = [
  { value: "open", label: "미확인" },
  { value: "acked", label: "확인됨" },
  { value: "canceled", label: "취소됨" },
];

const DIRECTION_LABEL: Record<string, string> = { to_academy: "등원", from_academy: "하원" };

// §5.16 GET·POST /staff/emergencies(EXC-04, A-16) — 비상 알림 목록·확인. 실시간 수신 팝업은
// `(staff)` 레이아웃의 EmergencyAlertProvider 가 맡고(R32-W5), 이 화면은 5초마다 목록을 다시 불러온다.
// 행을 열면 발신자·배치 인력 연락처·위치가 있는 상세 대화상자가 뜬다(R32-W6).
export const EmergencyList = () => {
  const [status, setStatus] = useState<EmergencyStatus>("open");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<EmergencyItemResponseTypes[]>([]);
  const [unackedCount, setUnackedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmergencyItemResponseTypes | null>(null);

  // 요청 번호 — 필터를 바꾸기 전에 나간 요청의 늦은 응답이 새 필터의 목록을 덮지 않게 최신 요청만 반영한다(F01-05).
  const requestSeq = useRef(0);

  // 돌려주는 값은 폴링용 성공 여부다 — 실패하면 `usePolling` 이 간격을 늘린다. 늦은 응답은 실패가 아니다.
  const load = useCallback(async (nextStatus: EmergencyStatus, nextDate: string, silent = false): Promise<boolean> => {
    const mine = ++requestSeq.current;
    // 주기 갱신(silent)은 표를 '불러오는 중' 으로 바꾸지 않는다.
    if (!silent) setLoading(true);
    try {
      const data = await getEmergencies({ status: nextStatus, date: nextDate || undefined });
      if (mine !== requestSeq.current) return true;
      setItems(data.items);
      setUnackedCount(data.unackedCount);
      setError(null);
      return true;
    } catch (cause) {
      if (mine !== requestSeq.current) return true;
      setError(cause instanceof ApiError ? cause.message : "비상 알림 목록을 불러오지 못했습니다");
      // F01-08 — 주기 갱신이 한 번 실패했다고 보이던 미확인 건을 지우면 "없다" 로 읽힌다. 오류 배너만 띄운다.
      if (!silent) setItems([]);
      return false;
    } finally {
      if (mine === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(status, date);
    })();
  }, [status, date, load]);
  // 비상 알림은 지연 인지 자체가 위험이라 화면을 열어 둔 동안 5초마다 다시 불러온다 — 응답을 받은 뒤 다음 요청을 예약한다.
  usePolling(() => load(status, date, true), EMERGENCY_POLL_INTERVAL_MS);

  const handleAck = async (emergencyId: string) => {
    setAckingId(emergencyId);
    setError(null);
    try {
      await ackEmergency(emergencyId);
      await load(status, date);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "확인 처리에 실패했습니다");
    } finally {
      setAckingId(null);
    }
  };

  const columns: RosterColumn<EmergencyItemResponseTypes>[] = [
    { key: "raisedAt", label: "발생 시각", render: (row) => formatDateTime(row.raisedAt) },
    { key: "type", label: "종류", render: (row) => <Badge tone="red">{EMERGENCY_TYPE_LABEL[row.type]}</Badge> },
    {
      key: "bus",
      label: "차량·방향",
      render: (row) => `${row.busNo} · ${DIRECTION_LABEL[row.direction] ?? row.direction}`,
    },
    {
      key: "raisedBy",
      label: "발신자",
      render: (row) => `${row.raisedBy.name ?? "-"} (${EMERGENCY_ROLE_LABEL[row.raisedBy.role]})`,
    },
    { key: "riderCount", label: "탑승 인원" },
    { key: "memo", label: "메모", render: (row) => row.memo ?? "-" },
    {
      key: "position",
      label: "발신 위치",
      render: (row) => (
        <StyledEmergencyPosition>
          <a href={emergencyMapUrl(row.position)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
            지도에서 보기
          </a>
        </StyledEmergencyPosition>
      ),
    },
    {
      key: "ack",
      label: "확인",
      align: "right",
      render: (row) =>
        row.acked ? (
          <Badge tone="added">확인됨</Badge>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled={ackingId === row.emergencyId}
            onClick={(event) => {
              event.stopPropagation();
              handleAck(row.emergencyId);
            }}
          >
            {ackingId === row.emergencyId ? "처리 중..." : "확인"}
          </Button>
        ),
    },
  ];

  return (
    <StyledEmergencyLayout>
      <PageHeader title="비상 알림 수신" description={`미확인 ${unackedCount}건`} />

      <StyledEmergencyFilters>
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => setStatus(value as EmergencyStatus)}
        />
        <Input
          label="날짜"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </StyledEmergencyFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {items.length >= RECENT_LIST_CAP ? (
        <AlertBanner tone="info" title={`최근 ${RECENT_LIST_CAP}건까지만 표시합니다 — 이전 기록은 날짜로 좁혀 확인하세요`} />
      ) : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable hasError={Boolean(error)}
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.emergencyId}
          onRowClick={setDetail}
          emptyMessage="해당 상태의 비상 알림이 없습니다"
        />
      </Card>

      {detail ? <EmergencyDetailDialog emergency={detail} onClose={() => setDetail(null)} /> : null}
    </StyledEmergencyLayout>
  );
};
