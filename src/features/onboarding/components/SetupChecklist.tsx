"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui";
import { getSetupProgress } from "../api";
import type { SetupProgressResponseTypes } from "../types";
import {
  StyledChecklistBody,
  StyledChecklistDone,
  StyledChecklistHint,
  StyledChecklistLink,
  StyledChecklistList,
  StyledChecklistTitle,
} from "./SetupChecklist.styled";

// 새 학원이 먼저 해야 하는 순서 — 차량이 있어야 노선·스케줄을 걸 수 있고, 매니저·학생은 노선에 배정된다.
const STEPS: { label: string; href: string; countOf: (progress: SetupProgressResponseTypes) => number }[] = [
  { label: "차량 등록", href: "/bus", countOf: (progress) => progress.busCount },
  { label: "매니저 등록", href: "/manager", countOf: (progress) => progress.managerCount },
  { label: "학생 등록", href: "/student", countOf: (progress) => progress.studentCount },
  { label: "노선 편성", href: "/route", countOf: (progress) => progress.routeCount },
  { label: "운행 스케줄 등록", href: "/schedule", countOf: (progress) => progress.scheduleCount },
];

// B1 #9 — 새 학원 대시보드의 시작 체크리스트. 다섯 단계를 다 끝내면 사라지고, 스케줄에 짝이 맞는 노선이 없으면
// 단계를 다 끝낸 뒤에도 경고만 남는다. 조회가 실패해도 대시보드를 막지 않는다(보조 안내라 오류를 화면에 올리지 않는다).
export const SetupChecklist = () => {
  const [progress, setProgress] = useState<SetupProgressResponseTypes | null>(null);

  useEffect(() => {
    getSetupProgress()
      .then(setProgress)
      .catch((cause: unknown) => console.warn("시작 체크리스트를 불러오지 못했다", cause));
  }, []);

  if (progress === null) return null;

  const allDone = STEPS.every((step) => step.countOf(progress) > 0);
  if (allDone && progress.schedulesWithoutRoute === 0) return null;

  return (
    <Card padding={0} aria-label="시작 안내">
      <StyledChecklistBody>
        {allDone ? null : (
          <>
            <StyledChecklistTitle>처음 시작하기 — 아래 순서로 등록하세요</StyledChecklistTitle>
            <StyledChecklistList>
              {STEPS.map((step, index) => (
                <li key={step.href}>
                  <StyledChecklistLink as={Link} href={step.href}>
                    {index + 1}. {step.label}
                  </StyledChecklistLink>{" "}
                  {step.countOf(progress) > 0 ? <StyledChecklistDone>완료({step.countOf(progress)})</StyledChecklistDone> : null}
                </li>
              ))}
            </StyledChecklistList>
          </>
        )}
        {progress.schedulesWithoutRoute > 0 ? (
          <StyledChecklistHint>
            노선이 없는 스케줄 {progress.schedulesWithoutRoute}건 — 그 회차는 확정할 노선이 없습니다.{" "}
            <StyledChecklistLink as={Link} href="/route">
              노선 편성으로 이동
            </StyledChecklistLink>
          </StyledChecklistHint>
        ) : null}
      </StyledChecklistBody>
    </Card>
  );
};
