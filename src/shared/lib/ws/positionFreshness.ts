// 화면에 있는 위치보다 오래된 위치 방송인가 — 수신 시각(`received_at`)으로 가린다(R57 K4 · W-7).
// 서버는 같은 회차의 방송 순서를 지키지만(`setPreservePublishOrder`), 재접속 직후 REST 스냅샷이나 두 연결이 겹치는 순간에는
// 늦게 온 옛 좌표가 새 좌표를 덮을 수 있다. 같은 시각은 낡은 것이 아니다. 시각을 못 읽으면 버리지 않는다(방송을 잃는 쪽이 더 나쁘다).
export const isStalePosition = (shownReceivedAt: string | null | undefined, incomingReceivedAt: string): boolean => {
  if (shownReceivedAt == null) return false;
  const shown = Date.parse(shownReceivedAt);
  const incoming = Date.parse(incomingReceivedAt);
  if (Number.isNaN(shown) || Number.isNaN(incoming)) return false;
  return incoming < shown;
};
