import { afterEach, describe, expect, it, vi } from "vitest";
import { getAcademySettings, updateAcademySettings } from "./index";

// §5.21 A-17 — snake_case ↔ camelCase 변환 경계. 필드가 noShowWaitMinutes
// 하나뿐이고(§5.21 이 명시적으로 다른 정책 상수를 범위 밖으로 뺐다) toSettings
// 함수 하나를 두 호출부가 공유한다 — report 와 같은 형태라 별도 대조 기법은
// 적용 대상이 아니다(§2 확신 없는 지점).
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("academy api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAcademySettings 는 noShowWaitMinutes 를 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse(200, { success: true, data: { no_show_wait_minutes: 3 } })),
    );

    const result = await getAcademySettings();

    expect(result).toEqual({ noShowWaitMinutes: 3 });
  });

  it("updateAcademySettings 는 요청 본문을 snake_case 로 보내고 응답을 camelCase 로 되돌린다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, { success: true, data: { no_show_wait_minutes: 10 } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateAcademySettings({ noShowWaitMinutes: 10 });

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toEqual({ no_show_wait_minutes: 10 });
    expect(result).toEqual({ noShowWaitMinutes: 10 });
  });
});
