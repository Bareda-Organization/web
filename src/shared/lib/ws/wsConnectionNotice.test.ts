import { describe, expect, it } from "vitest";
import { getWsConnectionNotice } from "./wsConnectionNotice";

// R46-FIXCONN C-12 — 같은 끊김을 화면마다 다른 문구로 알리던 것을 한 벌로 모은다(`API_SPEC §7` 연결 표 · Flutter 도 같은 문구).
describe("getWsConnectionNotice", () => {
  it("재연결 대기 중이면 재연결 안내를 돌려준다", () => {
    expect(getWsConnectionNotice("reconnecting")).toEqual({
      title: "재연결 시도 중입니다",
      body: "연결될 때까지 자동으로 계속 시도합니다. 그동안 새 소식이 늦게 보일 수 있습니다.",
    });
  });

  it("재연결을 포기했으면 끊김 안내를 돌려준다", () => {
    expect(getWsConnectionNotice("gaveUp")).toEqual({
      title: "실시간 연결 끊김",
      body: "실시간 갱신 연결이 끊어졌습니다. 새 소식이 늦게 보일 수 있습니다.",
    });
  });

  it("구독 권한이 없으면 권한 없음 안내를 돌려준다", () => {
    expect(getWsConnectionNotice("forbidden")).toEqual({
      title: "실시간 조회 권한 없음",
      body: "이 화면의 실시간 갱신을 볼 권한이 없습니다. 새 소식이 늦게 보일 수 있습니다.",
    });
  });

  it.each(["connected", "connecting", "disconnected"] as const)("%s 에서는 안내가 없다", (state) => {
    expect(getWsConnectionNotice(state)).toBeNull();
  });
});
