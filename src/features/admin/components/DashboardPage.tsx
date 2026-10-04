"use client";

import { useState } from "react";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { AlertBanner, Button, EmptyState, FilterBar, FilterGroup, PageHeader, SegmentedControl } from "@/shared/ui";
import { useDashboard } from "../lib/useDashboard";
import type { DashboardDays } from "../types/dashboard";
import { MetricsCard, RecentEventsCard, TodayRunsCard, makeAcademySlot } from "./DashboardBottom";
import type { StampTone } from "./DashboardPage.styled";
import { StyledBannerSlot, StyledDashboardPage, StyledGridThree, StyledGridTwo, StyledStack, StyledStamp, StyledStampDot } from "./DashboardPage.styled";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { AttentionCard, DailyCard, DashboardStats, ResultCard } from "./DashboardTop";

const DAYS_OPTIONS = [
  { value: "1", label: "오늘" },
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
];

// §6.18 메인 관리자 대시보드(O-02 · O-05 요약, Ruling 800 · 801) — 로그인 뒤 첫 화면. 한 번 읽고 30초마다 갱신한다.
// 갱신이 실패하면 마지막으로 받은 값을 그대로 두고 오류 띠 + [다시 시도] 를 얹는다(Ruling 433). 처음부터 못 받았으면 빈 화면에 오류 상태를 둔다.
export const DashboardPage = () => {
  const [days, setDays] = useState<DashboardDays>(7);
  const [academy, setAcademy] = useState("all");
  const { data, error, loading, academyOptions, retry } = useDashboard(days, academy);

  const stampTone: StampTone = error ? "stale" : data ? "live" : "loading";
  const asOfClock = data ? formatClockTime(data.asOf) : null;
  const stampText = error ? `${asOfClock ? `${asOfClock} 기준 · ` : ""}갱신 실패` : data ? `${asOfClock} 기준 · 30초마다 갱신` : "불러오는 중…";

  const academyChoices = [{ value: "all", label: "전체" }, ...academyOptions.map((option) => ({ value: option.academyId, label: option.academyName }))];
  const slotOf = data ? makeAcademySlot(data.academies, data.todayRuns) : () => 0 as const;

  return (
    <StyledDashboardPage>
      <PageHeader
        title="대시보드"
        description="전체 학원의 운행 · 변경 요청 · 로그인 현황 — 기간과 학원을 바꿔 가며 본다"
        actions={
          <StyledStamp>
            <StyledStampDot $tone={stampTone} aria-hidden="true" />
            {stampText}
          </StyledStamp>
        }
      />

      {error && data ? (
        <StyledBannerSlot>
          <AlertBanner
            tone="moving"
            title={`최신 데이터를 받지 못했습니다 — ${asOfClock} 에 받은 내용을 보고 있습니다`}
            action={
              <Button variant="secondary" size="sm" icon="refresh-cw" onClick={() => void retry()}>
                다시 시도
              </Button>
            }
          >
            자동 갱신이 실패해 마지막으로 받은 값을 그대로 두었습니다. 아래 숫자는 지금과 다를 수 있습니다.
          </AlertBanner>
        </StyledBannerSlot>
      ) : null}

      <FilterBar>
        <FilterGroup label="기간">
          <SegmentedControl options={DAYS_OPTIONS} value={String(days)} onChange={(value) => setDays(Number(value) as DashboardDays)} aria-label="기간" />
        </FilterGroup>
        <FilterGroup label="학원">
          <SegmentedControl options={academyChoices} value={academy} onChange={setAcademy} aria-label="학원" />
        </FilterGroup>
      </FilterBar>

      {data ? (
        <>
          <DashboardStats data={data} days={days} />
          <StyledGridThree>
            <AttentionCard attention={data.attention} now={new Date(data.asOf)} />
            <DailyCard daily={data.daily} />
            <ResultCard data={data} />
          </StyledGridThree>
          <StyledGridTwo>
            <TodayRunsCard data={data} slotOf={slotOf} />
            <StyledStack>
              <MetricsCard data={data} days={days} slotOf={slotOf} />
              <RecentEventsCard data={data} />
            </StyledStack>
          </StyledGridTwo>
        </>
      ) : error ? (
        <EmptyState
          tone="bad"
          icon="triangle-alert"
          title="대시보드를 불러오지 못했습니다"
          action={
            <Button variant="secondary" size="sm" icon="refresh-cw" onClick={() => void retry()}>
              다시 시도
            </Button>
          }
        >
          {error}
        </EmptyState>
      ) : loading ? (
        <DashboardSkeleton />
      ) : null}
    </StyledDashboardPage>
  );
};
