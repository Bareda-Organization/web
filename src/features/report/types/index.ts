// features/report 가 다루는 타입 전부 — 예외 보고 조회(§5.20, EXC-02·03, M-14).
// §4.13 (기사·동승자의 현장 상황 보고 작성)에 대응하는 읽기 전용 화면.

// §9.8 report_type — 실측(curl, driverA1 으로 보고 생성 후 staffA 로 조회)과
// 사양 표기가 일치했다(emergency.type 과 달리 이쪽은 소문자 그대로).
export type ReportType = "guardian_absent" | "road_block" | "vehicle_issue" | "etc";

// report_id — §5.20 표는 명시하지 않았으나 실측은 숫자였다.
export type ReportItemResponseTypes = {
  reportId: string;
  type: ReportType;
  memo: string;
  runId: string;
  busNo: string;
  // guardian_absent 일 때만 채워진다. 실측 확인.
  studentName: string | null;
  reportedBy: string;
  // Ruling 814 — 신고자 역할 · 처리한 관계자 이름. 서버가 아직 안 주면 null.
  reportedByRole: "driver" | "escort" | null;
  reportedAt: string;
  handled: boolean;
  handledAt: string | null;
  handledByName: string | null;
};

// ⚠ §5.20 은 §1.8 페이징 표현(`page`·`size`·`total_count`·`has_next`)을 안 썼고,
// 실측(빈 목록 vs notifications 의 빈 목록 대조)도 그 필드들이 없음을 확인했다
// (§2 확신 없는 지점 없음 — 직접 실측으로 확정). 그래서 이 화면은 페이징 UI를
// 붙이지 않는다.
export type ReportListResponseTypes = {
  items: ReportItemResponseTypes[];
  // Ruling 814 — `handled` 쿼리만 뺀 같은 조건의 건수(200건 상한과 무관). 서버가 아직 안 주면 null.
  counts: { handled: number; unhandled: number } | null;
};

export type ReportListQueryTypes = {
  type?: ReportType;
  date?: string;
  runId?: string;
  // Ruling 814 — 처리 여부 필터. 비우면 전체.
  handled?: boolean;
};
