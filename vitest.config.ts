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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
