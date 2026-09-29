// 발신 위치를 지도에서 열 주소 — 좌표 숫자만으로는 어디인지 알 수 없다. 새 창에서 브라우저 지도로 연다.
export const emergencyMapUrl = (position: { lat: number; lng: number }): string =>
  `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`;
