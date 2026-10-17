import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  NotificationListItemResponseTypes,
  NotificationListQueryTypes,
  NotificationListResponseTypes,
} from "../types";

// 일반 항목은 notificationId·recipientName·recipientRole·acked 를 주고, 묶음 항목(group=true, Ruling 813)은 대신
// groupKey·recipientCount·ackedCount·recipients 를 준다 — 한 화면 타입으로 합친다. 서버 id 는 숫자.
type WireNotificationItem = Omit<
  NotificationListItemResponseTypes,
  "notificationId" | "recipientName" | "recipientRole" | "acked"
> & {
  notificationId?: string | number;
  groupKey?: string;
  recipientName?: string;
  recipientRole?: string;
  acked?: boolean;
};

const toItem = ({ groupKey, ...raw }: WireNotificationItem): NotificationListItemResponseTypes => ({
  ...raw,
  // 묶음 항목(group=true)에는 notificationId 가 없다 — groupKey 가 그 묶음의 식별자다(§5.17).
  notificationId: groupKey ?? asIdString(raw.notificationId),
  recipientName: raw.recipientName ?? raw.recipients?.[0]?.recipientName ?? "",
  recipientRole: raw.recipientRole ?? raw.recipients?.[0]?.recipientRole ?? "",
  acked: raw.acked ?? (raw.recipientCount !== undefined && raw.ackedCount === raw.recipientCount),
  ...(raw.recipientCount !== undefined ? { ackedCount: raw.ackedCount ?? 0, recipients: raw.recipients ?? [] } : {}),
});

// "수신자 확인됨" 탭 건수(M-W4) — 같은 필터에서 `acked=true` 로 좁힌 총 건수만 읽는다(size 1).
// 서버가 확인을 추적하는 3종(Ruling 850)으로만 좁혀 주므로 "전체 − 미확인" 으로는 만들 수 없는 값이다.
// `group=false` 로 못박는다 — `unacked_count` 가 묶지 않은 행 기준이라 묶으면(total_count 가 묶음 단위) 두 탭 건수의 단위가 갈린다(§5.17).
export const getAckedNotificationCount = async (filters: Omit<NotificationListQueryTypes, "acked" | "group"> = {}): Promise<number> =>
  (await getNotifications(0, 1, { ...filters, acked: true, group: false })).totalCount;

// GET /staff/notifications (§5.17, NTF-10·11) — 조회 전용, 쓰기 엔드포인트 없음.
// unacked_count 는 §1.8 페이징 봉투에 없는 이 엔드포인트만의 추가 필드.
export const getNotifications = async (
  page: number,
  size = 20,
  filters: NotificationListQueryTypes = {},
): Promise<NotificationListResponseTypes> => {
  const raw = await apiFetch<Omit<NotificationListResponseTypes, "items"> & { items: WireNotificationItem[] }>("/staff/notifications", {
    method: "GET",
    query: { page, size, type: filters.type, date: filters.date, acked: filters.acked, recipient_role: filters.recipientRole, group: filters.group },
  });
  return { ...raw, items: raw.items.map(toItem) };
};
