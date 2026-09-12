"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, Input, PageHeader, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { ackEmergency, getEmergencies } from "../api";
import type { EmergencyItemResponseTypes, EmergencyStatus } from "../types";
import { StyledEmergencyFilters, StyledEmergencyLayout, StyledEmergencyPosition } from "./EmergencyList.styled";

const STATUS_OPTIONS: { value: EmergencyStatus; label: string }[] = [
  { value: "open", label: "미확인" },
  { value: "acked", label: "확인됨" },
  { value: "canceled", label: "취소됨" },
];

const TYPE_LABEL: Record<EmergencyItemResponseTypes["type"], string> = {
  accident: "사고",
  vehicle_fault: "차량 고장",
  student_emergency: "학생 응급상황",
  etc: "기타",
};

const ROLE_LABEL: Record<"driver" | "escort", string> = { driver: "기사", escort: "동승자" };
const DIRECTION_LABEL: Record<string, string> = { to_academy: "등원", from_academy: "하원" };

// §5.16 GET·POST /staff/emergencies(EXC-04, A-16) — 비상 알림 수신·확인. 지도는
// F4 범위라 위치는 좌표 텍스트로만 표시하고(§4 지시 그대로, 판단 근거) 나머지
// 필드는 전부 노출한다. 실시간 수신(WS emergency_raised)은 F3 범위 밖 — 이
// 화면은 폴링·수동 새로고침 기반 목록이다(§2 확신 없는 지점).
export const EmergencyList = () => {
  const [status, setStatus] = useState<EmergencyStatus>("open");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<EmergencyItemResponseTypes[]>([]);
  const [unackedCount, setUnackedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ackingId, setAckingId] = useState<number | null>(null);

  const load = useCallback(async (nextStatus: EmergencyStatus, nextDate: string) => {
    setLoading(true);
    try {
      const data = await getEmergencies({ status: nextStatus, date: nextDate || undefined });
      setItems(data.items);
      setUnackedCount(data.unackedCount);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "비상 알림 목록을 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(status, date);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleAck = async (emergencyId: number) => {
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
    { key: "raisedAt", label: "발생 시각" },
    { key: "type", label: "종류", render: (row) => <Badge tone="red">{TYPE_LABEL[row.type]}</Badge> },
    {
      key: "bus",
      label: "차량·방향",
      render: (row) => `${row.busNo} · ${DIRECTION_LABEL[row.direction] ?? row.direction}`,
    },
    {
      key: "raisedBy",
      label: "발신자",
      render: (row) => `${row.raisedBy.name ?? "-"} (${ROLE_LABEL[row.raisedBy.role]})`,
    },
    { key: "riderCount", label: "탑승 인원" },
    { key: "memo", label: "메모", render: (row) => row.memo ?? "-" },
    {
      key: "position",
      label: "발신 위치",
      render: (row) => (
        <StyledEmergencyPosition>
          {row.position.lat.toFixed(4)}, {row.position.lng.toFixed(4)}
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
          onChange={(event) => {
            setDate(event.target.value);
            load(status, event.target.value);
          }}
        />
      </StyledEmergencyFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} rows={items} getRowKey={(row) => row.emergencyId} />
      </Card>
    </StyledEmergencyLayout>
  );
};
