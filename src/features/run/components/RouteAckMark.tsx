import { Badge } from "@/shared/ui";
import type { RunStatus } from "../types";

type RouteAckMarkProps = {
  /** 그 자리에 배치된 사람 이름 — 비어 있으면(미배치) 표시할 대상이 없다 */
  name: string | null;
  acked: boolean;
  runStatus: RunStatus;
};

// MON-05 · RUN-07 — 기사·동승자의 노선(변경) 확인 응답 표시. 서버 ack 는 "현재 확정 노선 버전을 확인했는가" 라
// 노선이 아직 없는 idle 회차는 늘 거짓이라 의미가 없고, 끝난 회차는 확인을 재촉할 이유가 없다.
// 그래서 확정·운행 중 회차에 배치된 사람에게만 그린다(Ruling 492).
export const RouteAckMark = ({ name, acked, runStatus }: RouteAckMarkProps) => {
  if (name === null || (runStatus !== "confirmed" && runStatus !== "moving")) return null;
  return <Badge tone={acked ? "added" : "red"}>{acked ? "확인" : "미확인"}</Badge>;
};
