import type { NotificationType } from "../types";

// §5.17 `acked` · NTF-10 — 수신 확인을 추적하는 것은 중요 통지 3종뿐이다(Ruling 850).
// 서버(`IMPORTANT_FOR_ACK`)가 같은 3종만 추적·필터하고, 그 밖의 종류는 `acked` 가 언제나 false 라서
// 화면이 이 판정으로 "미확인" 과 "확인 대상 아님" 을 가른다. 종류를 늘리면 서버와 이 한 곳을 함께 고친다.
const ACK_TRACKED_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>(["delay", "no_show", "route_changed"]);

export const isAckTracked = (type: NotificationType): boolean => ACK_TRACKED_TYPES.has(type);
