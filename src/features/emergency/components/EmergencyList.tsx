"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { usePolling } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, EmptyState, Input, PageHeader, RosterTable, StatusChip, Tabs } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { deviceTimeNote } from "@/shared/lib/format/deviceTimeNote";
import { formatElapsed } from "@/shared/lib/format/elapsed";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { ackEmergency, getEmergencies } from "../api";
import { EMERGENCY_ROLE_LABEL, EMERGENCY_TYPE_LABEL } from "../lib/emergencyLabels";
import { emergencyMapUrl } from "../lib/mapLink";
import type { EmergencyItemResponseTypes, EmergencyStatus } from "../types";
import { EmergencyDetailDialog } from "./EmergencyDetailDialog";
import {
  StyledEmergencyBoard,
  StyledEmergencyCardHead,
  StyledEmergencyDeviceTime,
  StyledEmergencyFilters,
  StyledEmergencyLayout,
  StyledEmergencyPosition,
  StyledEmergencyStack,
  StyledSubLine,
} from "./EmergencyList.styled";
import { RECENT_LIST_CAP } from "@/shared/lib/format/listCap";

// 메인 관리자 화면(EmergencyAlertsPage)과 같은 주기.
const EMERGENCY_POLL_INTERVAL_MS = 5000;


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
  // 오늘 처리한 비상 알림 — 미확인 탭 아래에 함께 둔다(누가 · 언제 · 무엇을 했는지, A-16 이력). 보조 정보라 실패해도 본문 오류로 승격하지 않는다.
  const [history, setHistory] = useState<EmergencyItemResponseTypes[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

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
      setNowMs(Date.now());
      setError(null);
      if (nextStatus === "open" && !silent) {
        // 오늘 처리한 건 — 주기 갱신(5초)마다 부르지 않고 화면을 열 때 · 필터를 바꿀 때 · 확인한 직후에만 다시 읽는다.
        // 오늘 처리한 건 — 같은 호출을 확인됨 탭 · 오늘 날짜로 한 번 더 부른다.
        getEmergencies({ status: "acked", date: todayInSeoul() })
          .then((acked) => {
            if (mine === requestSeq.current) setHistory(acked.items.filter((item) => item.acked));
          })
          .catch(() => undefined);
      }
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

  const handleAck = async (emergencyId: string, memo?: string) => {
    setAckingId(emergencyId);
    setError(null);
    try {
      await ackEmergency(emergencyId, memo);
      setDetail(null);
      await load(status, date);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "확인 처리에 실패했습니다");
    } finally {
      setAckingId(null);
    }
  };

  const columns: RosterColumn<EmergencyItemResponseTypes>[] = [
    {
      key: "raisedAt",
      label: "발생 시각",
      render: (row) => {
        const note = deviceTimeNote(row.raisedAt, row.occurredAt);
        return (
          <>
            {formatDateTime(row.raisedAt)}
            <StyledSubLine>{formatElapsed(row.raisedAt, nowMs)} 접수</StyledSubLine>
            {note ? <StyledEmergencyDeviceTime>{note}</StyledEmergencyDeviceTime> : null}
          </>
        );
      },
    },
    { key: "type", label: "종류", render: (row) => <StatusChip tone="bad">{EMERGENCY_TYPE_LABEL[row.type]}</StatusChip> },
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
            variant="secondary"
            size="sm"
            aria-label={`${row.busNo} ${EMERGENCY_TYPE_LABEL[row.type]} 확인`}
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

  const top = status === "open" ? items[0] : undefined;
  const isEmptyOpen = !loading && !error && status === "open" && items.length === 0;

  return (
    <StyledEmergencyLayout>
      <PageHeader
        title="비상 알림"
        description={error ? undefined : `미확인 ${unackedCount}건 — 기사 · 동승자가 앱에서 보낸 비상 알림을 받아 전화하고 확인합니다`}
      />

      {top ? (
        <AlertBanner tone="missed" title={`${top.busNo} · ${DIRECTION_LABEL[top.direction] ?? top.direction} — ${EMERGENCY_TYPE_LABEL[top.type]} 신고 (${top.raisedBy.name ?? "-"} ${EMERGENCY_ROLE_LABEL[top.raisedBy.role]}) · ${formatElapsed(top.raisedAt, nowMs)}`}>
          탑승 중 학생 {top.riderCount}명. {EMERGENCY_ROLE_LABEL[top.raisedBy.role]}에게 전화해 상태를 확인하고 [확인]으로 접수 응답을 보내세요.
        </AlertBanner>
      ) : null}

      <Tabs
        aria-label="처리 상태"
        items={[
          { value: "open", label: "미확인", count: unackedCount },
          { value: "acked", label: "확인됨" },
          { value: "canceled", label: "취소됨" },
        ]}
        value={status}
        onChange={(value) => setStatus(value as EmergencyStatus)}
      />

      <StyledEmergencyFilters>
        <Input label="날짜" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <span>최근 {RECENT_LIST_CAP}건까지 · 미확인은 접수 순</span>
      </StyledEmergencyFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {items.length >= RECENT_LIST_CAP ? (
        <AlertBanner tone="info" title={`최근 ${RECENT_LIST_CAP}건까지만 표시합니다 — 이전 기록은 날짜로 좁혀 확인하세요`} />
      ) : null}

      <StyledEmergencyBoard>
        <StyledEmergencyStack>
          <Card padding={0} aria-busy={loading}>
            <StyledEmergencyCardHead>
              <h2>{status === "open" ? "확인해야 할 비상 알림" : status === "acked" ? "확인된 비상 알림" : "취소된 비상 알림"}</h2>
              {status === "open" && items.length > 0 ? <StatusChip tone="bad" marker={false}>{items.length}건</StatusChip> : null}
            </StyledEmergencyCardHead>
            {isEmptyOpen ? (
              <EmptyState slim icon="triangle-alert" title="확인해야 할 비상 알림이 없습니다" />
            ) : (
              <RosterTable
                hasError={Boolean(error)}
                onRetry={() => load(status, date)}
                columns={columns}
                loading={loading}
                rows={items}
                getRowKey={(row) => row.emergencyId}
                selectedKey={detail?.emergencyId ?? null}
                rowTone={(row) => (row.acked || row.canceledAt !== null ? undefined : "bad")}
                onRowClick={setDetail}
                emptyMessage="해당 상태의 비상 알림이 없습니다"
              />
            )}
          </Card>

          {status === "open" ? (
            <Card padding={0}>
              <StyledEmergencyCardHead>
                <h2>오늘 처리한 비상 알림</h2>
                <span>누가 · 언제 · 무엇을 했는지</span>
                <Button variant="ghost" size="sm" iconEnd="arrow-right" onClick={() => setStatus("acked")} style={{ marginLeft: "auto" }}>
                  확인됨 탭에서 모두 보기
                </Button>
              </StyledEmergencyCardHead>
              <RosterTable
                columns={[
                  {
                    key: "ackedAt",
                    label: "접수 · 확인",
                    render: (row) => (
                      <>
                        {formatDateTime(row.ackedAt)}
                        <StyledSubLine>{formatDateTime(row.raisedAt)} 접수 · {row.ackedBy?.name ?? "-"}</StyledSubLine>
                      </>
                    ),
                  },
                  { key: "type", label: "종류", render: (row) => <StatusChip tone="bad">{EMERGENCY_TYPE_LABEL[row.type]}</StatusChip> },
                  {
                    key: "bus",
                    label: "호차 · 발신자",
                    render: (row) => (
                      <>
                        {row.busNo} · {DIRECTION_LABEL[row.direction] ?? row.direction}
                        <StyledSubLine>{row.raisedBy.name ?? "-"} {EMERGENCY_ROLE_LABEL[row.raisedBy.role]}</StyledSubLine>
                      </>
                    ),
                  },
                  {
                    key: "memo",
                    label: "상황 · 조치",
                    render: (row) => (
                      <>
                        {row.memo ?? "-"}
                        {row.ackedBy?.memo ? <StyledSubLine>조치: {row.ackedBy.memo}</StyledSubLine> : null}
                      </>
                    ),
                  },
                ]}
                rows={history}
                getRowKey={(row) => row.emergencyId}
                emptyMessage="오늘 처리한 비상 알림이 없습니다"
              />
            </Card>
          ) : null}
        </StyledEmergencyStack>
      </StyledEmergencyBoard>

      {detail ? (
        <EmergencyDetailDialog
          emergency={detail}
          onClose={() => setDetail(null)}
          onAck={(memo) => handleAck(detail.emergencyId, memo)}
          acking={ackingId === detail.emergencyId}
        />
      ) : null}
    </StyledEmergencyLayout>
  );
};
