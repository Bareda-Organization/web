"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, EmptyState, PageHeader, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getEmergencies } from "../api";
import type { EmergencyItemResponseTypes, EmergencyType } from "../types";
import { EmergencyDetailDialog } from "./EmergencyDetailDialog";
import { StyledEmergencyAlertsLayout, StyledEmergencyHeaderRow } from "./EmergencyAlertsPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";

// §5.16 이 정의한 실제 쿼리값(open·acked·canceled, 기본 open) — 대문자 enum 이 아니다.
const STATUS_FILTER_OPTIONS = [
  { value: "open", label: "미확인" },
  { value: "acked", label: "확인됨" },
  { value: "canceled", label: "취소됨" },
];

// §5.16 이 정의한 실제 type 값(소문자 스네이크케이스). 서버 직렬화 정정(BE-R1 목표 3)
// 이후로는 항상 이 형태로 내려오므로 소문자 정규화 없이 그대로 조회한다.
const TYPE_LABEL: Record<string, string> = {
  accident: "사고",
  vehicle_fault: "차량 고장",
  student_emergency: "학생 응급",
  etc: "기타",
};

const toTypeLabel = (type: EmergencyType) => TYPE_LABEL[type] ?? type;

// 비상 알림은 지연 인지 자체가 위험이라(§6.11) 다른 화면보다 짧은 5초로 폴링한다.
const EMERGENCY_POLL_INTERVAL_MS = 5000;

// §6.11 비상 알림 이력(O-07). 메인 관리자는 전 학원 알림을 한 화면에서 보므로 목록에
// 학원명 열을 둔다(BRIEF-a1.md §2).
export const EmergencyAlertsPage = () => {
  const [status, setStatus] = useState("open");
  const [emergencies, setEmergencies] = useState<EmergencyItemResponseTypes[]>([]);
  const [unackedCount, setUnackedCount] = useState(0);
  const [detailTarget, setDetailTarget] = useState<EmergencyItemResponseTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (currentStatus: string) => {
    try {
      const data = await getEmergencies(currentStatus);
      setEmergencies(data.items);
      setUnackedCount(data.unackedCount);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "비상 알림 이력을 불러오지 못했습니다");
      setEmergencies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load(status);
    })();
    const timer = setInterval(() => {
      if (!cancelled) {
        load(status);
      }
    }, EMERGENCY_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status, load]);

  const columns: RosterColumn<EmergencyItemResponseTypes>[] = [
    { key: "academy", label: "학원", render: (row) => row.academy.name },
    { key: "type", label: "유형", render: (row) => toTypeLabel(row.type) },
    { key: "busNo", label: "버스" },
    { key: "raisedBy", label: "발신자", render: (row) => `${row.raisedBy.name ?? "미상"} (${row.raisedBy.role})` },
    { key: "raisedAt", label: "발신 시각", render: (row) => formatDateTime(row.raisedAt) },
    {
      key: "staffAcked",
      label: "학원 확인",
      render: (row) => <Badge tone={row.staffAcked ? "added" : "red"}>{row.staffAcked ? "확인됨" : "미확인"}</Badge>,
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setDetailTarget(row)}>
          상세
        </Button>
      ),
    },
  ];

  return (
    <StyledEmergencyAlertsLayout>
      <StyledEmergencyHeaderRow>
        <PageHeader title="비상 알림 이력" description="전 학원 비상 알림을 한 화면에서 확인합니다" />
        {unackedCount > 0 ? <Badge tone="red">미확인 {unackedCount}건</Badge> : null}
      </StyledEmergencyHeaderRow>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <SegmentedControl options={STATUS_FILTER_OPTIONS} value={status} onChange={setStatus} />

      <Card padding={0} aria-busy={loading}>
        {!loading && emergencies.length === 0 ? (
          <EmptyState icon="siren" title="해당 상태의 비상 알림이 없습니다" />
        ) : (
          <RosterTable columns={columns} loading={loading} rows={emergencies} getRowKey={(row) => row.emergencyId} />
        )}
      </Card>

      {detailTarget ? <EmergencyDetailDialog emergency={detailTarget} onClose={() => setDetailTarget(null)} /> : null}
    </StyledEmergencyAlertsLayout>
  );
};
