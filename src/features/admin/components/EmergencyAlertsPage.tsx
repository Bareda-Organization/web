"use client";

import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, EmptyState, PageHeader, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getEmergencies } from "../api";
import type { EmergencyItemResponseTypes } from "../types";
import { emergencyTypeLabel } from "../lib/emergencyType";
import { EmergencyDetailDialog } from "./EmergencyDetailDialog";
import { StyledEmergencyAlertsLayout, StyledEmergencyHeaderRow } from "./EmergencyAlertsPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { formatRole } from "@/shared/lib/format/roleLabel";
import { RECENT_LIST_CAP } from "@/shared/lib/format/listCap";

// §5.16 이 정의한 실제 쿼리값(open·acked·canceled, 기본 open) — 대문자 enum 이 아니다.
const STATUS_FILTER_OPTIONS = [
  { value: "open", label: "미확인" },
  { value: "acked", label: "확인됨" },
  { value: "canceled", label: "취소됨" },
];

// 발신 후 경과 초 → "N분" (1분 미만은 그대로 알린다).
const formatElapsed = (seconds: number): string => (seconds < 60 ? "1분 미만" : `${Math.floor(seconds / 60)}분`);

// 비상 알림은 지연 인지 자체가 위험이라(§6.11) 다른 화면보다 짧은 5초로 폴링한다.
const EMERGENCY_POLL_INTERVAL_MS = 5000;

// §6.11 비상 알림 이력(O-07). 메인 관리자는 전 학원 알림을 한 화면에서 보므로 목록에
// 학원명 열을 둔다(BRIEF-a1.md §2).
export const EmergencyAlertsPage = () => {
  const [status, setStatus] = useState("open");
  const [detailTarget, setDetailTarget] = useState<EmergencyItemResponseTypes | null>(null);
  // 갱신이 한 번 실패해도 이미 보이던 미확인 목록은 지우지 않는다(usePagedList) — 오류 배너만 더한다.
  const { items: emergencies, data, loading, error } = usePagedList(
    async () => {
      const response = await getEmergencies(status);
      return { ...response, totalCount: response.items.length, hasNext: false };
    },
    { resetKey: status, pollMs: EMERGENCY_POLL_INTERVAL_MS, errorMessage: "비상 알림 이력을 불러오지 못했습니다" },
  );
  const unackedCount = data?.unackedCount ?? 0;

  const columns: RosterColumn<EmergencyItemResponseTypes>[] = [
    { key: "academy", label: "학원", render: (row) => row.academy.name },
    { key: "type", label: "유형", render: (row) => emergencyTypeLabel(row.type) },
    { key: "busNo", label: "버스" },
    { key: "raisedBy", label: "발신자", render: (row) => `${row.raisedBy.name ?? "미상"} (${formatRole(row.raisedBy.role)})` },
    // §6.11 elapsed_since_raised — 관계자가 몇 분째 응답하지 않았는지가 이 화면의 핵심 정보다(미응답 지연 인지).
    { key: "elapsed", label: "경과", render: (row) => formatElapsed(row.elapsedSinceRaised) },
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
      {emergencies.length >= RECENT_LIST_CAP ? (
        <AlertBanner tone="info" title={`최근 ${RECENT_LIST_CAP}건까지만 표시합니다 — 그 이전 이력은 이 화면에서 볼 수 없습니다`} />
      ) : null}

      <SegmentedControl options={STATUS_FILTER_OPTIONS} value={status} onChange={setStatus} />

      <Card padding={0} aria-busy={loading}>
        {!loading && !error && emergencies.length === 0 ? (
          <EmptyState icon="siren" title="해당 상태의 비상 알림이 없습니다" />
        ) : (
          <RosterTable columns={columns} loading={loading} rows={emergencies} getRowKey={(row) => row.emergencyId} />
        )}
      </Card>

      {detailTarget ? <EmergencyDetailDialog emergency={detailTarget} onClose={() => setDetailTarget(null)} /> : null}
    </StyledEmergencyAlertsLayout>
  );
};
