// route 기능의 공개 창구. 밖에서는 이 파일만 import 한다 (`frontend/CONVENTIONS.md` "디렉터리").
export { RouteList } from "./components/RouteList";
export { RouteDetail } from "./components/RouteDetail";
export * from "./types";
// R15-T2 — §5.19 노선 조회는 RTE 도메인(route) 소유이지만 지도에 그리는 화면은
// run·admin 쪽이다. `features/map` 이 이미 같은 이유로 기능 경계를 넘어 쓰이는
// 전례(`frontend/CONVENTIONS.md` "기능끼리 서로 import 하지 않는다"의 유일한 기존
// 예외)를 따라 이 함수 하나만 공개 창구에 얹는다(보고서 §2, 확신 없는 지점).
export { getRunRoute } from "./api";
