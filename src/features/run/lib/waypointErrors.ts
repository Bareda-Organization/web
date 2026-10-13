import { ApiError } from "@/shared/lib/http";

export type WaypointFailure = {
  message: string;
  // 안내 뒤 경유 지점 목록을 서버 값으로 새로 읽는다(마감 · 이미 사라진 경유 지점).
  reload: boolean;
  // 미리보기를 버린다(입력은 둔다) — 낡은 미리보기 · 마감처럼 그 미리보기로는 배포할 수 없을 때.
  redoPreview: boolean;
};

const plain = (message: string, flags: Partial<Pick<WaypointFailure, "reload" | "redoPreview">> = {}): WaypointFailure => ({
  message,
  reload: flags.reload ?? false,
  redoPreview: flags.redoPreview ?? false,
});

/** §5.15 오류 코드별 관계자 웹 문구 — 영문 코드 · 서버 원문은 화면에 내지 않는다. */
export const describeWaypointFailure = (cause: unknown): WaypointFailure => {
  if (!(cause instanceof ApiError)) return plain("경유 지점을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요");
  switch (cause.code) {
    case "CHANGE_WINDOW_CLOSED":
      return plain("변경 마감 시각이 지나 경유 지점을 바꿀 수 없어요 (운행 시작 뒤, 또는 출발 시각 10분 뒤)", { reload: true, redoPreview: true });
    case "RUN_CANCELED":
      return plain("취소된 회차라 경유 지점을 바꿀 수 없어요");
    case "PREVIEW_STALE":
      return plain("그 사이 명단이나 승하차지가 바뀌어 미리보기가 낡았어요 — 다시 미리보기를 눌러 확인해 주세요", { redoPreview: true });
    case "ADDRESS_VERIFICATION_FAILED":
      return plain("주소를 확인하지 못했어요. 주소를 다시 검색해서 골라 주세요");
    case "RUN_NOT_FOUND":
      return plain("이 회차를 찾을 수 없어요. 오늘 운행 목록에서 다시 골라 주세요");
    case "VALIDATION_FAILED":
      return plain("입력을 확인해 주세요 — 주소를 골랐는지, 표시명이 100자 이내인지, 넣을 자리가 맞는지 살펴보세요");
    case "RUN_NOT_CONFIRMED":
      return plain("아직 확정되지 않은 회차예요 — 출발 30분 전에 노선이 확정된 뒤에 정할 수 있어요");
    case "ROUTE_NOT_CONFIGURED_FOR_RUN":
      return plain("이 회차에 노선이 편성되지 않았어요 — 노선 편성에서 이 버스·요일·방향의 노선을 먼저 정해 주세요");
    case "WAYPOINT_NOT_FOUND":
      return plain("이미 삭제됐거나 아직 배포되지 않은 경유 지점이에요. 목록을 새로 불러왔어요", { reload: true });
    case "MAP_ROUTE_UNAVAILABLE":
      return plain("지도 서비스에서 경로를 계산하지 못했어요. 잠시 뒤 다시 시도해 주세요");
    default:
      return plain("경유 지점을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요");
  }
};
