import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 멀티스테이지 빌드에서 node_modules 전체를 복사하지 않고
  // 실행에 필요한 파일만 추린 .next/standalone 산출물을 만든다.
  output: "standalone",
  turbopack: {
    // School-Bus 저장소 루트에 이 앱과 무관한 package-lock.json 이 있어
    // Turbopack 이 워크스페이스 루트를 그쪽으로 잘못 추정한다.
    // globals.css 가 ../../../design-system/styles.css 를 상대 경로로 참조하므로
    // 루트를 이 앱 자신(academy-web)으로 좁히면 그 참조가 루트 밖이라 깨진다.
    // 따라서 두 디렉터리를 모두 포함하는 공통 조상인 frontend/ 를 루트로 지정한다.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
