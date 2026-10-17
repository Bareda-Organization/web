"use client";

import { useRealtimeConnection } from "../../hooks";
import { getWsConnectionNotice } from "../../lib/ws";
import { StyledConnectionBand, StyledRealtimeConnectionStrip } from "./RealtimeConnectionStrip.styled";

// 실시간 연결이 끊겼을 때 레이아웃 머리줄 아래에 한 줄 띄우는 앰버 연결 띠 — 비상·승인 화면처럼 연결 상태를 안 읽던 화면에서도 끊김이 보이게
// 레이아웃에 한 번만 둔다. 문구는 `getWsConnectionNotice` 한 벌이고 학부모·매니저 앱과 제목이 같다.
// 정상·연결 시도 중·직접 끊음에는 아무것도 그리지 않는다 — 화면을 처음 열 때 깜빡이지 않게.
export const RealtimeConnectionStrip = () => {
  const { connectionState } = useRealtimeConnection();
  const notice = getWsConnectionNotice(connectionState);
  if (notice === null) return null;

  return (
    <StyledRealtimeConnectionStrip data-realtime-strip>
      <StyledConnectionBand role="status" data-realtime-band>
        <b>{notice.title}</b>
        {notice.body ? <span>{notice.body}</span> : null}
      </StyledConnectionBand>
    </StyledRealtimeConnectionStrip>
  );
};
