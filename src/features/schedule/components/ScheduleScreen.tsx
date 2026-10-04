"use client";

import { useEffect, useState } from "react";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { Button, PageHeader, Tabs } from "@/shared/ui";
import { getRuns, getSchedules } from "../api";
import { RunDayList } from "./RunDayList";
import { ScheduleList } from "./ScheduleList";
import { StyledScheduleLayout } from "./ScheduleList.styled";

type Section = "schedule" | "run";

const DESCRIPTION: Record<Section, string> = {
  schedule: "요일·시간별 정규 운행 계획 — 매일 00:05 에 오늘·내일 회차가 이 스케줄로 만들어집니다",
  run: "특정일 회차 — 정규 스케줄에서 만들어진 회차를 확인하고, 하루만 바뀌는 일은 임시로 추가·취소합니다",
};

// §5.10 운행 스케줄 · 일일 회차(A-09) — 탭 둘(정규 스케줄 · 일일 회차)과 헤더의 등록 단추를 이 화면이 쥐고,
// 단추가 여는 창(스케줄 등록 · 임시 회차 추가)은 각 목록이 그린다. 탭 이름 옆 건수는 보조 정보라 못 받으면 건수만 뺀다.
export const ScheduleScreen = () => {
  const [section, setSection] = useState<Section>("schedule");
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [counts, setCounts] = useState<{ schedules?: number; runs?: number }>({});

  useEffect(() => {
    let alive = true;
    getSchedules(0, 1).then((data) => alive && setCounts((prev) => ({ ...prev, schedules: data.totalCount }))).catch(() => undefined);
    getRuns(todayInSeoul()).then((data) => alive && setCounts((prev) => ({ ...prev, runs: data.items.filter((run) => run.canceledAt === null).length }))).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <StyledScheduleLayout>
      <PageHeader
        title="운행 스케줄"
        description={DESCRIPTION[section]}
        actions={
          <Button variant="primary" icon="plus" onClick={() => (section === "schedule" ? setCreating(true) : setAdding(true))}>
            {section === "schedule" ? "스케줄 등록" : "임시 회차 추가"}
          </Button>
        }
      />
      <Tabs
        aria-label="구역"
        items={[
          { value: "schedule", label: "정규 스케줄", count: counts.schedules },
          { value: "run", label: "일일 회차 · 오늘", count: counts.runs },
        ]}
        value={section}
        onChange={(value) => setSection(value as Section)}
      />
      {section === "schedule" ? <ScheduleList creating={creating} onCreatingChange={setCreating} /> : <RunDayList adding={adding} onAddingChange={setAdding} />}
    </StyledScheduleLayout>
  );
};
