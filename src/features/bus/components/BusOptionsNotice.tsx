"use client";

import { AlertBanner, Button } from "@/shared/ui";
import { BUS_OPTION_LIMIT } from "../lib/useBusOptions";

type BusOptionsNoticeProps = {
  error: string | null;
  hasMore: boolean;
  onRetry: () => void;
};

// 차량 선택칸 아래에 두는 안내 — 조회 실패면 이유와 [다시 시도], 상한을 넘으면 일부만 보인다는 사실.
export const BusOptionsNotice = ({ error, hasMore, onRetry }: BusOptionsNoticeProps) => {
  if (error) {
    return (
      <AlertBanner
        tone="missed"
        title={error}
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        }
      />
    );
  }
  if (hasMore) {
    return <AlertBanner tone="info" title={`차량이 ${BUS_OPTION_LIMIT}대를 넘어 앞의 ${BUS_OPTION_LIMIT}대만 보입니다`} />;
  }
  return null;
};
