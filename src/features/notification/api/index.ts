import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  NotificationListItemResponseTypes,
  NotificationListQueryTypes,
  NotificationListResponseTypes,
  NotificationType,
} from "../types";

type RawNotificationItem = {
  notification_id?: string | number;
  sent_at: string;
  bus_no: string | null;
  recipient_name: string;
  recipient_role: string;
  type: NotificationType;
  body: string;
  acked: boolean;
  // 묶음 항목(group=true, Ruling 813) — 묶지 않은 응답에는 없다. 묶음 항목은 acked · recipient_* 대신 이 값들을 준다.
  group_key?: string;
  recipient_count?: number;
  acked_count?: number;
  recipients?: { recipient_name: string; recipient_role: string }[];
};

type RawNotificationListResponse = {
  items: RawNotificationItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
  unacked_count: number;
};

const toItem = (raw: RawNotificationItem): NotificationListItemResponseTypes => ({
  // 묶음 항목(group=true)에는 notification_id 가 없다 — group_key 가 그 묶음의 식별자다(§5.17).
  notificationId: raw.group_key ?? asIdString(raw.notification_id),
  sentAt: raw.sent_at,
  busNo: raw.bus_no,
  recipientName: raw.recipient_name ?? raw.recipients?.[0]?.recipient_name ?? "",
  recipientRole: raw.recipient_role ?? raw.recipients?.[0]?.recipient_role ?? "",
  type: raw.type,
  body: raw.body,
  acked: raw.acked ?? (raw.recipient_count !== undefined && raw.acked_count === raw.recipient_count),
  ...(raw.recipient_count !== undefined
    ? {
        recipientCount: raw.recipient_count,
        ackedCount: raw.acked_count ?? 0,
        recipients: (raw.recipients ?? []).map((r) => ({ recipientName: r.recipient_name, recipientRole: r.recipient_role })),
      }
    : {}),
});

// GET /staff/notifications (§5.17, NTF-10·11) — 조회 전용, 쓰기 엔드포인트 없음.
// unacked_count 는 §1.8 페이징 봉투에 없는 이 엔드포인트만의 추가 필드.
export const getNotifications = async (
  page: number,
  size = 20,
  filters: NotificationListQueryTypes = {},
): Promise<NotificationListResponseTypes> => {
  const raw = await apiFetch<RawNotificationListResponse>("/staff/notifications", {
    method: "GET",
    query: { page, size, type: filters.type, date: filters.date, acked: filters.acked, recipient_role: filters.recipientRole, group: filters.group },
  });
  return {
    items: raw.items.map(toItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
    unackedCount: raw.unacked_count,
  };
};
