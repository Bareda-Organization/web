// features/notification 이 다루는 타입 전부 — 알림 로그 조회(§5.17, NTF-10·11, A-13).
// 조회 전용 화면(쓰기 엔드포인트 없음).

// §9.7 알림 종류 전체 21종 — 정본에서 직접 세었다(row 21개, 값도 21개로 소계 일치).
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
  | "link_requested"
  | "route_changed"
  | "assignment_changed"
  | "no_show_escalated"
  | "exception_reported"
  | "emergency"
  | "emergency_canceled";

// ⚠ notification_id — §5.17 표는 타입을 string 으로 적었지만, 실측(curl, staffA 로그인)
// 응답은 매번 숫자였다(§2 확신 없는 지점 · 사양-실제 불일치로 보고). 화면은 실측을 따른다.
export type NotificationListItemResponseTypes = {
  notificationId: number;
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
