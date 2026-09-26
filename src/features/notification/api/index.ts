import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  NotificationListItemResponseTypes,
  NotificationListQueryTypes,
  NotificationListResponseTypes,
  NotificationType,
} from "../types";

type RawNotificationItem = {
  notification_id: string | number;
  sent_at: string;
  bus_no: string | null;
  recipient_name: string;
  recipient_role: string;
  type: NotificationType;
  body: string;
  acked: boolean;
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
  notificationId: asIdString(raw.notification_id),
  sentAt: raw.sent_at,
  busNo: raw.bus_no,
  recipientName: raw.recipient_name,
  recipientRole: raw.recipient_role,
  type: raw.type,
  body: raw.body,
  acked: raw.acked,
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
    query: { page, size, type: filters.type, date: filters.date, acked: filters.acked },
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
