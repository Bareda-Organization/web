// features/notification 이 다루는 타입 전부 — 알림 로그 조회(§5.17, NTF-10·11, A-13).
// 조회 전용 화면(쓰기 엔드포인트 없음).

// §9.7 알림 종류 전체 20종 — 정본에서 직접 세었다(Ruling 324 로 link_requested 삭제 — 21종→20종).
export type NotificationType =
  | "boarding"
  | "alighting"
  | "boarding_canceled"
  | "alighting_canceled"
  | "no_show"
  | "absent"
  | "arrive"
  | "delay"
  | "run_started"
  | "run_ended"
  | "signup_decided"
  | "change_decided"
  | "approval_requested"
  | "intent_changed"
  | "route_changed"
  | "assignment_changed"
  | "no_show_escalated"
  | "exception_reported"
  | "emergency"
  | "emergency_canceled";

// ⚠ notification_id — §5.17 표는 타입을 string 으로 적었지만, 실측(curl, staffA 로그인)
// 응답은 매번 숫자였다(§2 확신 없는 지점 · 사양-실제 불일치로 보고). W1 흡수로 서버가 숫자든
// 문자열이든 이 도메인 타입은 string 으로 고정한다(asIdString, api/index.ts 참고).
export type NotificationListItemResponseTypes = {
  notificationId: string;
  sentAt: string;
  busNo: string | null;
  recipientName: string;
  recipientRole: string;
  type: NotificationType;
  body: string;
  acked: boolean;
};

export type NotificationListResponseTypes = {
  items: NotificationListItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
  unackedCount: number;
};

export type NotificationListQueryTypes = {
  type?: NotificationType;
  date?: string;
  acked?: boolean;
};
