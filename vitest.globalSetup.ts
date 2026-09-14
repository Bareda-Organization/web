// vitest `globalSetup` — 시험 실행 전체(모든 워커·모든 파일)를 통틀어 정확히 한 번 불린다.
// `setupFiles`(파일마다 불림)와 다르다 — 초기화는 파일 수만큼이 아니라 실행 1회당 1회여야
// 하므로 이쪽에 둔다(FE-R3 W3 목표 10, 판단 근거 `realBackendReset.ts`).
import { resetRealBackendSeedIfConfigured } from "./src/shared/testing/realBackendReset";

export default async function setup() {
  await resetRealBackendSeedIfConfigured();
}
