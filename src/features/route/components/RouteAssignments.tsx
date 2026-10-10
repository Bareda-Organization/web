"use client";

import { useEffect, useState } from "react";
import { getRuns } from "@/features/schedule";
import type { RunItemResponseTypes } from "@/features/schedule";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { Card } from "@/shared/ui";
import { DefinitionList } from "@/shared/ui/display";
import type { RunDirection, Weekday } from "../types";
import { addDays, runsOfRoute } from "../lib/routeAssignments";
import { StyledAssignmentsTitle } from "./RouteDetail.styled";

type Props = { busId: string; weekday: Weekday; direction: RunDirection };

const monthDay = (date: string): string => date.slice(5).replace("-", "/");

// 한 회차의 기사 · 동승 — 비어 있으면 미배치.
const crewText = (run: RunItemResponseTypes): string => {
  const nameOf = (role: "driver" | "escort") => run.assignments.find((assignment) => assignment.role === role)?.name ?? "미배치";
  return `기사 ${nameOf("driver")} · 동승자 ${nameOf("escort")}`;
};

// A-08 — 이 편성(차량 × 요일 × 방향)과 같은 오늘 · 내일 회차의 배치 매니저(GET /staff/runs?service_date=, §5.10).
// 보조 정보라 못 받아도 상세 화면은 그대로 쓴다. 해당 회차가 없으면 없다고 말한다.
export const RouteAssignments = ({ busId, weekday, direction }: Props) => {
  const [today] = useState(() => todayInSeoul());
  const tomorrow = addDays(today, 1);
  const [state, setState] = useState<{ runs: RunItemResponseTypes[] } | "loading" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    Promise.all([getRuns(today), getRuns(tomorrow)])
      .then(([first, second]) => alive && setState({ runs: runsOfRoute([...first.items, ...second.items], { busId, weekday, direction }) }))
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, [busId, weekday, direction, today, tomorrow]);

  return (
    <Card padding={20} aria-label="배치 매니저" role="region">
      <StyledAssignmentsTitle>배치 매니저 · 오늘 · 내일 회차</StyledAssignmentsTitle>
      {state === "loading" ? (
        <p>불러오는 중입니다</p>
      ) : state === "failed" ? (
        <p>배치 정보를 불러오지 못했습니다</p>
      ) : state.runs.length === 0 ? (
        <p>
          오늘 · 내일({monthDay(today)} · {monthDay(tomorrow)}) 중 이 편성의 회차가 없습니다
        </p>
      ) : (
        <DefinitionList
          items={state.runs.map((run) => ({
            term: `${monthDay(run.serviceDate)} ${run.serviceDate === today ? "오늘" : "내일"}`,
            value: crewText(run),
          }))}
        />
      )}
    </Card>
  );
};
