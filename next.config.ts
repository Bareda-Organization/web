import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 멀티스테이지 빌드에서 node_modules 전체를 복사하지 않고
  // 실행에 필요한 파일만 추린 .next/standalone 산출물을 만든다. Vercel 배포에는 영향이 없다.
  output: "standalone",
  turbopack: {
    // 루트를 이 저장소로 고정한다 — 비워 두면 Turbopack 이 상위 폴더의 다른 lockfile 을
    // 워크스페이스 루트로 잘못 추정한다. globals.css 가 참조하는 design-system/ 도 이 저장소 안에 있다
    // (2026-10-02 저장소 분리 전에는 두 단계 위 frontend/ 를 가리켰다).
    root: __dirname,
  },
};

export default nextConfig;
