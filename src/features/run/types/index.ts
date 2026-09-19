// features/run 이 다루는 타입 전부 — API 응답은 `OOOResponseTypes` (`CONVENTIONS.md`).
// 서버는 snake_case(§1.1)를 쓰지만 이 파일의 타입은 앱 내부 관례대로 camelCase 다 —
// snake_case ↔ camelCase 변환은 `api/*.ts` 호출부가 경계에서 한 번만 한다.

export type RunStatus = "idle" | "confirmed" | "moving" | "finished";

// §5.3 GET /staff/dashboard — 미처리 에스컬레이션 1건.
export type NoShowCaseResponseTypes = {
  studentName: string;
  stopName: string;
  expiresAt: string;
};

// §5.3 runs[] 행 하나.
export type DashboardRunResponseTypes = {
  runId: number;
  busNo: string;
  direction: "to_academy" | "from_academy";
  departTime: string;
  // R21-B — 실제 출발·종료(도착) 시각. `departTime`(예정)과 구별해서 쓴다. 출발·종료
  // 전이면 서버가 null 로 채운다(§5.3 API_SPEC 갱신분).
  startedAt: string | null;
  finishedAt: string | null;
  driverName: string | null;
  escortName: string | null;
  boardedCount: number;
  totalCount: number;
  runStatus: RunStatus;
  addedCount: number;
  removedCount: number;
  ackDriver: boolean;
  ackEscort: boolean;
  noShowCases: NoShowCaseResponseTypes[];
};

export type DashboardResponseTypes = {
  metrics: {
    movingBuses: number;
    boarded: number;
    noShow: number;
    absent: number;
    unassignedManagers: number;
  };
  runs: DashboardRunResponseTypes[];
};

// §5.18 GET /staff/runs/live — 5~10초 주기로 폴링하는 실시간 위치 초기 스냅샷.
// lat·lng 는 DashboardPage·TodayRunPage 의 버스 마커 좌표로 쓰인다.
export type RunLivePositionResponseTypes = {
  lat: number;
  lng: number;
  recordedAt: string;
} | null;

export type RunLiveItemResponseTypes = {
  runId: number;
  busNo: string;
  direction: "to_academy" | "from_academy";
  status: RunStatus;
  position: RunLivePositionResponseTypes;
  currentStop: string | null;
  nextStop: string | null;
  progress: { done: number; total: number };
  delayMinutes: number | null;
  driverName: string | null;
  escortName: string | null;
  lastSeenAt: string | null;
};

export type RunsLiveResponseTypes = {
  runs: RunLiveItemResponseTypes[];
};

// §5.4 GET /staff/runs/{runId}/roster.
export type RosterChange = "added" | "removed" | null;
export type RosterStatus = "waiting" | "boarded" | "alighted" | "absent" | "no_show";

export type RosterItemResponseTypes = {
  studentId: number;
  name: string;
  className: string | null;
  stopName: string;
  guardianPhone: string;
  change: RosterChange;
  status: RosterStatus;
  note: string | null;
};

// §5.7 POST /staff/runs/{runId}/forced-add.
export type ForcedAddRequestTypes = {
  studentId?: number;
  newStudentName?: string;
  address: string;
  note?: string;
};

export type ForcedAddResponseTypes = {
  forcedAdditionId: number;
  runId: number;
  studentId: number;
  stopId: number;
  status: "staged";
};

// §5.13 GET /staff/managers — 배치 대화상자의 후보 목록 조회용(§5.14 를 위한 부수 조회).
export type ManagerRole = "driver" | "escort";

export type ManagerSummaryResponseTypes = {
  id: number;
  name: string;
  phone: string;
  role: ManagerRole;
};

// §5.14 PATCH /staff/runs/{runId}/assignment.
export type AssignmentRequestTypes = {
  driverManagerId?: number;
  escortManagerId?: number;
};

export type AssignmentEntryResponseTypes = {
  managerId: number;
  name: string;
  role: ManagerRole;
};

export type AssignmentWarningCode = "WORK_HOURS_MISMATCH" | "MANAGER_DOUBLE_BOOKED" | "WORK_HOURS_NOT_SET";

export type AssignmentWarningResponseTypes = {
  code: AssignmentWarningCode;
  managerId: number;
  role: ManagerRole;
  message: string;
};

export type AssignmentResponseTypes = {
  runId: number;
  assignments: AssignmentEntryResponseTypes[];
  warnings: AssignmentWarningResponseTypes[];
};
