// 발신 위치를 지도에서 열 주소 — 좌표 숫자만으로는 어디인지 알 수 없다. 새 창에서 네이버 지도 웹으로 연다.
// `/p/search/<위도>,<경도>` 는 좌표를 검색어로 받아 그 자리에 핀을 찍고 주소를 보여준다(R36-FE FE3, 시청·부산·수원 3곳 실측).
// ⚠ 경도가 앞인 `?c=<경도>,<위도>` 형식은 새 지도에서 좌표가 무시돼 현재 위치로 열린다.
export const emergencyMapUrl = (position: { lat: number; lng: number }): string =>
  `https://map.naver.com/p/search/${position.lat},${position.lng}`;
