import type { Metadata } from "next";
import { EmotionRegistry } from "@/shared/lib/EmotionRegistry";
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
        <EmotionRegistry>{children}</EmotionRegistry>
      </body>
    </html>
  );
}
