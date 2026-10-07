// schedule 기능의 공개 창구. 밖에서는 이 파일만 import 한다 (`docs/frontend/web/CONVENTIONS_REACT.md` "디렉터리").
export { ScheduleScreen } from "./components/ScheduleScreen";
// getSchedules 는 route 기능이 편성 상세의 "연결된 스케줄" 을, getRuns 는 report(회차 필터 후보)·route(편성의 오늘·내일 배치)가 날짜별 회차를 읽으려고
// 가져다 쓴다(기능 간 참조는 이 배럴로만).
export { getRuns, getSchedules } from "./api";
export * from "./types";
