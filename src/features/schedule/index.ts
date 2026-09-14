// schedule 기능의 공개 창구. 밖에서는 이 파일만 import 한다 (`frontend/CONVENTIONS.md` "디렉터리").
export { ScheduleScreen } from "./components/ScheduleScreen";
// getRuns 는 route 기능의 RunWaypointPanel 이 "오늘 회차 카탈로그" 를 만드는 데
// 재사용한다(FE-R3 W3 목표 9 판정 — 화면 설계 문제, 새 엔드포인트를 만들지 않고
// 기존 SCH-02 호출을 기능 경계 밖에서 이 배럴로만 가져다 쓴다).
export { getRuns } from "./api";
export * from "./types";
