// features/run 이 다루는 타입 전부 — API 응답은 `OOOResponseTypes` (`CONVENTIONS_REACT.md`).
// 서버는 snake_case(§1.1)를 쓰지만 이 파일의 타입은 앱 내부 관례대로 camelCase 다 —
// snake_case ↔ camelCase 변환은 `api/*.ts` 호출부가 경계에서 한 번만 한다.

export type RunStatus = "idle" | "confirmed" | "moving" | "finished";

// §5.3 GET /staff/dashboard — 미처리 에스컬레이션 1건.
export type NoShowCaseResponseTypes = {
  studentName: string;
  stopName: string;
  expiresAt: string;
  // Ruling 810 — 그 케이스에 남은 연락 시도 수와 마지막 결과. 서버가 아직 안 주면 0 · null.
  callAttempts: number;
  lastContactResult: "answered" | "no_answer" | null;
};

// Ruling 810 — 그 회차의 마지막 지연 알림(§4.9). 없으면 null.
export type LastDelayNoticeResponseTypes = {
  minutes: number;
  reason: string | null;
  sentAt: string;
  recipientCount: number;
};

// §5.3 runs[] 행 하나.
export type DashboardRunResponseTypes = {
  runId: string;
  busNo: string;
  direction: "to_academy" | "from_academy";
  departTime: string;
  // R21-B — 실제 출발·종료(도착) 시각. `departTime`(예정)과 구별해서 쓴다. 출발·종료
  // 전이면 서버가 null 로 채운다(§5.3 API_SPEC 갱신분).
  startedAt: string | null;
  finishedAt: string | null;
  // R21-B2 — 예정 도착(depart_time + est_duration_min). 회차에 소요 시간 추정치가 없으면
  // null — "-" 로 비워 표시한다.
  estArrivalTime: string | null;
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
  // Ruling 810 — 배치 인력 전화 원문(배치 전 null) · 이 회차의 미승차·미등원 수 · 지연.
  // 서버가 아직 안 주면 전화 null · 미승차는 진행 중 케이스 수 · 미등원 0 · 지연 null 로 견딘다.
  driverPhone: string | null;
  escortPhone: string | null;
  noShowCount: number;
  absentCount: number;
  delayMinutes: number | null;
  lastDelayNotice: LastDelayNoticeResponseTypes | null;
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
  runId: string;
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
  studentId: string;
  name: string;
  className: string | null;
  // 예정 명단에서 승하차지가 아직 정해지지 않은 학생은 null(§5.4).
  stopName: string | null;
  // Ruling 811 — 그 승하차지의 정차 항목 id · 순번. 노선(§5.19 stops[].stopId)과 이름이 아니라 id 로 잇는다
  // (같은 이름의 승하차지가 둘이면 이름 맞추기가 틀린다). 확정 전 예정 명단 · 옛 서버는 null.
  stopId?: string | null;
  stopSeq?: number | null;
  // 이동 대기(§5.8 staged)로 이 회차에 들어온 행에만 — 이 값으로 §5.8.1 취소(Ruling 369).
  transferId: string | null;
  guardianPhone: string | null;
  change: RosterChange;
  status: RosterStatus;
  note: string | null;
};

// 강제 승하차지 추가에서 기존 학생을 이름으로 찾은 결과 한 건(§5.11 GET /staff/students?q=).
export type StudentSearchItemTypes = {
  studentId: string;
  name: string;
  className: string | null;
};

// §5.7 POST /staff/runs/{runId}/forced-add.
export type ForcedAddRequestTypes = {
  studentId?: string;
  newStudentName?: string;
  address: string;
  note?: string;
};

export type ForcedAddResponseTypes = {
  forcedAdditionId: string;
  runId: string;
  studentId: string;
  stopId: string;
  status: "staged";
};

// §5.8 POST /staff/students/{id}/transfer(A-07) — stopId·address 는 배타적(둘 중 하나 필수).
export type TransferRequestTypes = {
  fromRunId: string;
  toRunId: string;
  stopId?: string;
  address?: string;
  note?: string;
};

export type TransferResponseTypes = {
  transferId: string;
  studentId: string;
  fromRunId: string;
  toRunId: string;
  stopId: string | null;
  status: "staged";
  impact: {
    from: { riderCountBefore: number; riderCountAfter: number };
    to: { riderCountBefore: number; riderCountAfter: number; capacity: number };
  };
};

// §5.13 GET /staff/managers — 배치 대화상자의 후보 목록 조회용(§5.14 를 위한 부수 조회).
export type ManagerRole = "driver" | "escort";

export type ManagerSummaryResponseTypes = {
  id: string;
  name: string;
  phone: string;
  role: ManagerRole;
};

// §5.14 PATCH /staff/runs/{runId}/assignment.
export type AssignmentRequestTypes = {
  driverManagerId?: string;
  escortManagerId?: string;
};

export type AssignmentEntryResponseTypes = {
  managerId: string;
  name: string;
  role: ManagerRole;
};

export type AssignmentWarningCode = "WORK_HOURS_MISMATCH" | "MANAGER_DOUBLE_BOOKED" | "WORK_HOURS_NOT_SET";

export type AssignmentWarningResponseTypes = {
  code: AssignmentWarningCode;
  managerId: string;
  role: ManagerRole;
  message: string;
};

export type AssignmentResponseTypes = {
  runId: string;
  assignments: AssignmentEntryResponseTypes[];
  warnings: AssignmentWarningResponseTypes[];
};
