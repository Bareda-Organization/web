import { afterEach, describe, expect, it, vi } from "vitest";
import { getBlockedAccounts } from "./blockedAccounts";

// W6 — API_SPEC §6.10 이 목록에 role · status_before_block 을 추가했다(`Ruling 328`).
// 해제하면 그 값으로 되돌아간다는 게 관리자가 해제 전에 미리 알아야 할 정보다
// (`UF-O-03`).
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("blockedAccounts api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getBlockedAccounts 는 role·status_before_block 을 camelCase 로 흡수한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              {
                account_id: 5,
                login_id: "staffA",
                name: "이관계",
                academy_name: "바래다 학원",
                blocked_at: "2026-09-10T09:00:00Z",
                failed_attempts: 5,
                reason: "로그인 5회 연속 실패",
                role: "staff",
                status_before_block: "pending",
              },
            ],
            page: 1,
            size: 20,
            total_count: 1,
            has_next: false,
          },
        }),
      ),
    );

    const result = await getBlockedAccounts();

    expect(result.items[0].role).toBe("staff");
    expect(result.items[0].statusBeforeBlock).toBe("pending");
  });
});
