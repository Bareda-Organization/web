import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 화면 배관(features/auth) 을 재현 가능한 조건 3종으로 고정한다 — 보고서 4항이 지목한
// "브라우저 없이도 확인 가능한 순수 분기 로직" 전용. 무거운 e2e 는 이 설정의 목적이 아니다
// (브라우저가 필요한 확인은 실제 Chrome 구동으로 별도 완료됨).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // FE-R3 W3 목표 10 — `globalSetup` 이 실행 1회당 한 번 `POST /dev/reset` 조건부
    // 호출을 시도한다(`vitest.globalSetup.ts`). 그 초기화(Flyway clean+migrate, 순간적이지
    // 않다)가 도는 동안 다른 실서버 계약 시험 파일이 같은 스키마를 동시에 읽으면 전이
    // 상태(테이블 없음·부분 시드)를 코드 결함과 구별할 수 없이 관측한다 — Dart 쪽
    // `dart_test.yaml` 의 `concurrency: 1` 과 같은 이유로 파일 실행을 직렬로 강제한다.
    globalSetup: ["./vitest.globalSetup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
