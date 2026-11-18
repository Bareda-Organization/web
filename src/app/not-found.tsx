import Link from "next/link";
import { EmptyState } from "@/shared/ui";

// 없는 주소로 들어왔을 때 — 루트 화면은 로그인 판정으로 이어지므로 처음으로 보낸다.
export default function NotFound() {
  return (
    <EmptyState
      icon="search-x"
      title="페이지를 찾을 수 없습니다"
      action={<Link href="/">처음으로</Link>}
    >
      주소가 바뀌었거나 없는 페이지입니다.
    </EmptyState>
  );
}
