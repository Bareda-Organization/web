import { describe, expect, it } from "vitest";
import { academyLiveDestination, adminLiveDestination } from "./wsChannel";

// `docs/API_SPEC.md §7` 채널 표의 목적지 문자열을 그대로 정본으로 삼는다 —
// 서버의 `WsChannel`(백엔드) 빌더와 한 글자라도 어긋나면 SUBSCRIBE 가 조용히
// 다른(존재하지 않는) 목적지로 나가 아무 이벤트도 못 받는다.
describe("wsChannel", () => {
  it("academyLiveDestination 은 /topic/academy/{academyId}/live 를 만든다", () => {
    expect(academyLiveDestination("42")).toBe("/topic/academy/42/live");
  });

  it("adminLiveDestination 은 고정 목적지 /topic/admin/live 를 만든다", () => {
    expect(adminLiveDestination()).toBe("/topic/admin/live");
  });
});
