"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, PageHeader } from "@/shared/ui";
import { getRouteDetail } from "../api";
import type { RouteDetailResponseTypes } from "../types";
import { RouteDeleteDialog } from "./RouteDeleteDialog";
import { StyledRouteDetailActions, StyledRouteDetailLayout } from "./RouteDetail.styled";
import { RouteForm } from "./RouteForm";
import { RouteStopsPanel } from "./RouteStopsPanel";
import { RunWaypointPanel } from "./RunWaypointPanel";

const WEEKDAY_LABEL: Record<string, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
const DIRECTION_LABEL: Record<string, string> = { to_academy: "등원", from_academy: "하원" };

type RouteDetailProps = {
  routeId: number;
};

// 화면 4 — 고정 노선 편성 · 정차 순서 최적화(§5.9, A-08) + 확정 노선 경유 지점 지정
// (§5.15, A-15). 지시서가 이 둘을 화면 하나로 묶어 두었고(FEATURE_SPEC A-15 정의 재확인,
// §1 판단 근거), 편집 폼(RouteForm)·정차 관리(RouteStopsPanel)·경유 지점(RunWaypointPanel)
// 셋을 이 상세 화면에서 함께 구성한다.
export const RouteDetail = ({ routeId }: RouteDetailProps) => {
  const router = useRouter();
  const [route, setRoute] = useState<RouteDetailResponseTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const detail = await getRouteDetail(routeId);
      setRoute(detail);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "노선 편성을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  if (loading) return <p>불러오는 중...</p>;
  if (error && !route) return <AlertBanner tone="missed" title={error} />;
  if (!route) return null;

  return (
    <StyledRouteDetailLayout>
      <PageHeader
        title={`${route.busNo} · ${WEEKDAY_LABEL[route.weekday]} · ${DIRECTION_LABEL[route.direction]}`}
        description={route.name ?? undefined}
        actions={
          <StyledRouteDetailActions>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              편성 정보 수정
            </Button>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              삭제
            </Button>
          </StyledRouteDetailActions>
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <RouteStopsPanel routeId={routeId} />

      <RunWaypointPanel busId={route.busId} direction={route.direction} />

      {editing ? (
        <RouteForm
          route={route}
          onClose={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            load();
          }}
        />
      ) : null}

      {deleting ? (
        <RouteDeleteDialog
          routeId={routeId}
          onCancel={() => setDeleting(false)}
          onDeleted={() => router.push("/route")}
        />
      ) : null}
    </StyledRouteDetailLayout>
  );
};
