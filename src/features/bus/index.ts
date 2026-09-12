// bus 기능의 공개 창구. 밖에서는 이 파일만 import 한다 (`frontend/CONVENTIONS.md` "디렉터리").
// getBuses 는 route 기능이 편성 폼의 차량 선택지를 채우려고 가져다 쓴다(기능 간 참조는
// 이 배럴로만 — 내부 파일을 직접 가리키지 않는다).
export { BusList } from "./components/BusList";
export { getBuses } from "./api";
export * from "./types";
