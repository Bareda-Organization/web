import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { EmotionRegistry } from "@/shared/lib/EmotionRegistry";
import { AuthSessionProvider } from "@/features/auth";
import "./globals.css";

// 폰트는 디자인 시스템 토큰(`design-system/tokens/fonts.css`)이 CDN `@import` 로 이미 실어 온다
// — `next/font` 로 별도 로드하면 같은 폰트를 두 경로로 받아오게 된다.
export const metadata: Metadata = {
  title: "바래다 관계자 웹",
  description: "학원 통학버스 운행·학생 등하원 관리",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <EmotionRegistry>
          {/* 세션 부트스트랩은 트리 전체에서 한 번만 — (auth)·(staff)·(admin) 세 그룹이
              전부 이 컨텍스트를 구독한다. */}
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </EmotionRegistry>
        <SpeedInsights />
      </body>
    </html>
  );
}
