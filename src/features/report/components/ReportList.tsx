"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, Drawer, FilterBar, FilterGroup, Input, PageHeader, RosterTable, SegmentedControl, Select, StatStrip, StatusChip, useToast } from "@/shared/ui";
import type { StatStripItem, StatusChipTone } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getRuns } from "@/features/schedule";
import { getReports, handleReport } from "../api";
import type { ReportItemResponseTypes, ReportType } from "../types";
import { StyledReportKv, StyledReportLayout, StyledReportNote } from "./ReportList.styled";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { RECENT_LIST_CAP } from "@/shared/lib/format/listCap";

const TYPE_LABEL: Record<ReportType, string> = {
  guardian_absent: "보호자 부재",
  road_block: "도로 통제",
  vehicle_issue: "차량 이상",
  etc: "기타",
};

const TYPE_TONE: Record<ReportType, StatusChipTone> = { guardian_absent: "info", road_block: "warn", vehicle_issue: "bad", etc: "off" };
const ROLE_LABEL = { driver: "기사", escort: "동승자" } as const;
const DAY_MS = 86_400_000;

// §5.20 GET /staff/reports(EXC-02·03, M-14) — 예외 보고 조회 전용 목록. 페이징
// 없음(types/index.ts 주석에 실측 근거 — shared/types/index.ts 의 §1.8 주석은
// 리포트도 공통 페이징을 쓴다고 적었으나, 실측은 반대였다. 보고서 §2 확신
// 없는 지점). 상세 화면은 목록 항목과 필드 구성이 같아(실측 확인) 따로
// 두지 않는다(판단 근거, 보고서 §1).
export const ReportList = () => {
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [runId, setRunId] = useState("");
  // 처리 필터("" 전체 · false 미처리 · true 처리됨) — Ruling 814.
  const [handled, setHandled] = useState("");
  const [counts, setCounts] = useState<{ handled: number; unhandled: number } | null>(null);
  // 종류별 건수 — 종류를 고르지 않은 조회에서만 새로 센다(고르면 다른 종류의 건수를 모른다).
  const [typeCounts, setTypeCounts] = useState<Record<ReportType, number> | null>(null);
  const [selected, setSelected] = useState<ReportItemResponseTypes | null>(null);
  // "며칠째 미처리" 계산의 기준 시각 — 조회 결과를 받을 때 갱신한다(렌더 중에 시계를 읽지 않는다).
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const { show } = useToast();
  // 회차 필터 후보 — 고른 날짜의 회차(GET /staff/runs?service_date=). 날짜를 비우면 서버가 당일을 주므로(§5.10 · §5.20) 둘 다 같은 날 기준이다.
  const [runOptions, setRunOptions] = useState<{ value: string; label: string }[]>([{ value: "", label: "전체" }]);
  const [items, setItems] = useState<ReportItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // [다시 시도] — 조회 조건은 그대로 두고 같은 조회를 한 번 더 낸다.
  const [retryCount, setRetryCount] = useState(0);
  // 요청 번호 — 조건을 바꾸기 전에 나간 요청의 늦은 응답이 새 조건의 목록을 덮지 않게 한다(F01-05).
  const requestSeq = useRef(0);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const data = await getRuns(date === "" ? undefined : date);
        if (canceled) return;
        setRunOptions([
          { value: "", label: "전체" },
          ...data.items.map((run) => ({
            value: run.id,
            label: `${formatClockTime(run.departTime)} ${run.busNo} · ${run.direction === "to_academy" ? "등원" : "하원"}`,
          })),
        ]);
      } catch {
        // 회차 필터는 보조 조건이라 후보를 못 불러도 "전체" 로 조회는 된다 — 본문 오류로 올리지 않는다.
        if (!canceled) setRunOptions([{ value: "", label: "전체" }]);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [date]);

  // 종류·날짜·회차 어느 것이 바뀌어도 조회는 이 한 곳에서 한 번 나간다.
  useEffect(() => {
    const mine = ++requestSeq.current;
    (async () => {
      setLoading(true);
      try {
        const result = await getReports({
          type: type === "" ? undefined : (type as ReportType),
          date: date === "" ? undefined : date,
          runId: runId === "" ? undefined : runId,
          handled: handled === "" ? undefined : handled === "true",
        });
        if (mine !== requestSeq.current) return;
        setItems(result.items);
        setCounts(result.counts);
        setNowMs(Date.now());
        if (type === "") {
          const next: Record<ReportType, number> = { guardian_absent: 0, road_block: 0, vehicle_issue: 0, etc: 0 };
          result.items.forEach((item) => {
            next[item.type] += 1;
          });
          setTypeCounts(next);
        }
        setError(null);
      } catch (cause) {
        if (mine !== requestSeq.current) return;
        setError(cause instanceof ApiError ? cause.message : "운행 리포트를 불러오지 못했습니다");
        setItems([]);
      } finally {
        if (mine === requestSeq.current) setLoading(false);
      }
    })();
  }, [type, date, runId, handled, retryCount]);

  const unhandledItems = items.filter((item) => !item.handled);
  const oldest = unhandledItems.reduce<ReportItemResponseTypes | null>(
    (acc, item) => (acc === null || Date.parse(item.reportedAt) < Date.parse(acc.reportedAt) ? item : acc),
    null,
  );

  const handleMark = async (item: ReportItemResponseTypes) => {
    setMarking(true);
    setMarkError(null);
    try {
      const updated = await handleReport(item.reportId);
      setItems((previous) => previous.map((row) => (row.reportId === updated.reportId ? updated : row)));
      setCounts((previous) => (previous && !item.handled ? { handled: previous.handled + 1, unhandled: Math.max(0, previous.unhandled - 1) } : previous));
      setSelected(updated);
      show({ title: "처리 완료로 표시했습니다", detail: `${TYPE_LABEL[item.type]} · ${item.busNo}` });
    } catch (cause) {
      setMarkError(cause instanceof ApiError ? cause.message : "처리 표시에 실패했습니다");
    } finally {
      setMarking(false);
    }
  };

  const columns: RosterColumn<ReportItemResponseTypes>[] = [
    { key: "reportedAt", label: "신고 시각", render: (row) => <b>{formatDateTime(row.reportedAt)}</b> },
    { key: "type", label: "종류", render: (row) => <StatusChip tone={TYPE_TONE[row.type]} marker={false}>{TYPE_LABEL[row.type]}</StatusChip> },
    { key: "busNo", label: "차량" },
    { key: "studentName", label: "학생", render: (row) => row.studentName ?? "-" },
    {
      key: "reportedBy",
      label: "신고자",
      render: (row) => (
        <>
          {row.reportedBy}
          {row.reportedByRole ? <StyledReportNote>{ROLE_LABEL[row.reportedByRole]}</StyledReportNote> : null}
        </>
      ),
    },
    { key: "memo", label: "내용" },
    {
      key: "handled",
      label: "처리",
      align: "right",
      render: (row) => (
        <StatusChip tone={row.handled ? "ok" : "warn"} marker={false} quiet={row.handled}>
          {row.handled ? "처리됨" : "미처리"}
        </StatusChip>
      ),
    },
  ];

  const summaryItems: StatStripItem[] = [
    { label: "표시 중 신고", value: items.length, unit: "건", detail: `최근 신고부터 · 최대 ${RECENT_LIST_CAP}건` },
    {
      label: "미처리",
      value: counts?.unhandled ?? unhandledItems.length,
      unit: "건",
      tone: (counts?.unhandled ?? unhandledItems.length) > 0 ? "warn" : "neutral",
      detail: oldest
        ? `가장 오래된 건 ${formatDateTime(oldest.reportedAt).slice(5, 10).replace("-", "/")} (${Math.max(1, Math.floor((nowMs - Date.parse(oldest.reportedAt)) / DAY_MS) + 1)}일째)`
        : "미처리 신고가 없습니다",
    },
    ...(["guardian_absent", "road_block", "vehicle_issue"] as const).map((reportType) => ({
      label: TYPE_LABEL[reportType],
      value: typeCounts?.[reportType] ?? items.filter((item) => item.type === reportType).length,
      unit: "건",
      detail: reportType === "guardian_absent" ? "하원 시 학생 인계 후 신고" : reportType === "road_block" ? "우회 · 지연 사유" : "차량 점검 필요",
    })),
  ];

  const totalChip = typeCounts ? Object.values(typeCounts).reduce((sum, n) => sum + n, 0) : items.length;
  const typeOptions = [
    { value: "", label: `전체 ${totalChip}` },
    ...(Object.keys(TYPE_LABEL) as ReportType[]).map((value) => ({ value, label: `${TYPE_LABEL[value]}${typeCounts ? ` ${typeCounts[value]}` : ""}` })),
  ];
  const handledOptions = [
    { value: "", label: counts ? `전체 ${counts.handled + counts.unhandled}` : "전체" },
    { value: "false", label: counts ? `미처리 ${counts.unhandled}` : "미처리" },
    { value: "true", label: counts ? `처리됨 ${counts.handled}` : "처리됨" },
  ];
  const filtered = items.length === 0 && !loading && !error;

  return (
    <StyledReportLayout>
      <PageHeader title="운행 리포트" description={error ? undefined : "매니저 앱이 보낸 보호자 부재 · 도로 통제 · 차량 이상 신고를 되짚어 봅니다"} />

      <StatStrip items={summaryItems} />

      <FilterBar summary={`총 ${items.length}건 · 행을 누르면 상세가 옆에서 열립니다`}>
        <FilterGroup label="종류">
          <SegmentedControl aria-label="종류 필터" options={typeOptions} value={type} onChange={setType} />
        </FilterGroup>
        <FilterGroup label="처리">
          <SegmentedControl aria-label="처리 필터" options={handledOptions} value={handled} onChange={setHandled} />
        </FilterGroup>
        <Select label="회차" options={runOptions} value={runId} onChange={(event) => setRunId(event.target.value)} />
        <Input
          label="날짜"
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            // 다른 날짜의 회차 id 를 그대로 두면 후보에 없는 값으로 조회가 나간다.
            setRunId("");
          }}
        />
      </FilterBar>

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {items.length >= RECENT_LIST_CAP ? (
        <AlertBanner tone="info" title={`최근 ${RECENT_LIST_CAP}건까지만 표시합니다 — 이전 기록은 날짜로 좁혀 확인하세요`} />
      ) : null}
      <Card flush aria-busy={loading}>
        <RosterTable
          hasError={Boolean(error)}
          onRetry={() => setRetryCount((count) => count + 1)}
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.reportId}
          selectedKey={selected?.reportId ?? null}
          emptyMessage={filtered ? "조건에 맞는 신고가 없습니다" : undefined}
          onRowClick={(row) => {
            setMarkError(null);
            setSelected(row);
          }}
        />
      </Card>

      {selected ? (
        <Drawer
          title={`${selected.studentName ? `${selected.studentName} · ` : ""}${TYPE_LABEL[selected.type]}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                닫기
              </Button>
              {selected.handled ? null : (
                <Button icon="circle-check" disabled={marking} onClick={() => handleMark(selected)}>
                  {marking ? "처리 중..." : "처리 완료로 표시"}
                </Button>
              )}
            </>
          }
        >
          <StyledReportKv>
            <p>
              {selected.busNo} · 신고 {formatDateTime(selected.reportedAt).slice(5)}
            </p>
            <div>
              <StatusChip tone={TYPE_TONE[selected.type]} marker={false}>{TYPE_LABEL[selected.type]}</StatusChip>{" "}
              <StatusChip tone={selected.handled ? "ok" : "warn"} marker={false} quiet={selected.handled}>
                {selected.handled ? "처리됨" : "미처리"}
              </StatusChip>
            </div>
            <dl>
              <div>
                <dt>신고 시각</dt>
                <dd>{formatDateTime(selected.reportedAt).slice(5)}</dd>
              </div>
              <div>
                <dt>차량</dt>
                <dd>{selected.busNo}</dd>
              </div>
              {selected.studentName ? (
                <div>
                  <dt>학생</dt>
                  <dd>{selected.studentName}{selected.type === "guardian_absent" ? " (보호자 부재 대상)" : ""}</dd>
                </div>
              ) : null}
              <div>
                <dt>신고자</dt>
                <dd>{selected.reportedBy}{selected.reportedByRole ? ` ${ROLE_LABEL[selected.reportedByRole]}` : ""}</dd>
              </div>
              <div>
                <dt>처리</dt>
                <dd>
                  {selected.handled
                    ? `처리됨 · ${selected.handledByName ?? "-"}${selected.handledAt ? ` · ${formatDateTime(selected.handledAt)}` : ""}`
                    : "미처리 · 처리 이력 없음"}
                </dd>
              </div>
            </dl>
            <h3>내용</h3>
            <p>{selected.memo}</p>
            {markError ? <AlertBanner tone="missed" title={markError} /> : null}
            <AlertBanner tone="info">
              신고는 푸시 한 번으로 끝나지 않고 이 목록에 남습니다. 후속 조치를 마쳤다면 [처리 완료로 표시]를 눌러 미처리에서 빼세요.
            </AlertBanner>
          </StyledReportKv>
        </Drawer>
      ) : null}
    </StyledReportLayout>
  );
};
