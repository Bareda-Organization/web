// run 기능의 공개 창구. 밖에서는 이 파일만 import 한다 (`docs/frontend/web/CONVENTIONS_REACT.md` "디렉터리").
export { DashboardPage } from "./components/DashboardPage";
export { TodayRunPage } from "./components/TodayRunPage";
export { getDashboard } from "./api";
export * from "./types";
