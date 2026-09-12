"use client";

import { useState } from "react";
import { PageHeader, SegmentedControl } from "@/shared/ui";
import { RunDayList } from "./RunDayList";
import { ScheduleList } from "./ScheduleList";
import { StyledScheduleLayout } from "./ScheduleList.styled";

type Section = "schedule" | "run";

const SECTION_OPTIONS = [
  { value: "schedule", label: "정규 스케줄" },
  { value: "run", label: "일일 회차" },
];

// §5.10 운행 스케줄 · 일일 회차(A-09) — 전용 데스크톱 Tabs 컴포넌트가 shared/ui 에
// 없어(TabBar 는 모바일 하단 내비 형태라 부적합, shared/ui 인벤토리 확인) 페이지 내
// 구역 전환에 SegmentedControl 을 쓴다(emergency 화면의 상태 필터와 같은 전례,
// §2 확신 없는 지점).
export const ScheduleScreen = () => {
  const [section, setSection] = useState<Section>("schedule");

  return (
    <StyledScheduleLayout>
      <PageHeader title="운행 스케줄 · 일일 회차" description="정규 운행 스케줄과 특정일 회차를 관리합니다" />
      <SegmentedControl options={SECTION_OPTIONS} value={section} onChange={(value) => setSection(value as Section)} />
      {section === "schedule" ? <ScheduleList /> : <RunDayList />}
    </StyledScheduleLayout>
  );
};
