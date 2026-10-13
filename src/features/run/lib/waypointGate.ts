import type { AccountRole } from "@/features/auth";
import type { RunStatus } from "../types";

export type WaypointAccess = { kind: "hidden" } | { kind: "blocked"; reason: string } | { kind: "open" };

/**
 * [경유 지점] 을 보일지 — Ruling 893. 학원 관계자만(메인 관리자는 ROUTE_MANAGE 가 없어 서버가 403),
 * 확정된 회차(`confirmed`)에서만 연다. 변경 마감(출발 + 10분)은 화면이 시계로 따지지 않고 서버의 403 CHANGE_WINDOW_CLOSED 로 처리한다.
 */
export const waypointAccess = (role: AccountRole | undefined, status: RunStatus): WaypointAccess => {
  if (role !== "staff") return { kind: "hidden" };
  if (status === "idle") return { kind: "blocked", reason: "아직 확정 전인 회차예요 — 출발 30분 전에 노선이 확정된 뒤에 경유 지점을 정할 수 있어요" };
  if (status === "moving" || status === "finished") return { kind: "blocked", reason: "운행이 시작되어 경유 지점을 바꿀 수 없어요" };
  return { kind: "open" };
};
