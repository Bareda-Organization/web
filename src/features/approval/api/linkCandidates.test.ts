import { afterEach, describe, expect, it, vi } from "vitest";
import { searchManagerCandidates, searchStudentCandidates } from "./linkCandidates";

const jsonResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => ({ success: true, data: body }) }) as Response;

const manager = (id: number, role: string, accountId: number | null) => ({
  id,
  name: `매니저${id}`,
  phone: "010-0000-0000",
  role,
  account_id: accountId,
});

// F02-02 · Z-02(Ruling 391) — 서버가 role·linked 필터를 준다. 훑지 않고 필터를 붙여 한 번만 묻는다.
describe("searchManagerCandidates — 서버 필터로 연결 가능한 매니저만 받는다", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("role 과 linked=false 를 붙여 한 번만 요청하고 받은 매니저를 후보로 낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [manager(3, "driver", null)],
        page: 0,
        size: 100,
        total_count: 1,
        has_next: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await searchManagerCandidates("driver", "김");

    expect(candidates.map((candidate) => candidate.name)).toEqual(["매니저3"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.searchParams.get("role")).toBe("driver");
    expect(url.searchParams.get("linked")).toBe("false");
    expect(url.searchParams.get("q")).toBe("김");
  });
});

// B1 #14 — 같은 이름 학생을 가르는 정보. 반이 같아도 보호자 연락처(서버가 목록에 주는 값)가 다르다.
describe("searchStudentCandidates — 동명이인 구분 정보", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("반과 보호자 연락처를 함께 보여 주고, 보호자가 연결되지 않은 학생은 그렇게 적는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            { student_id: 1, name: "김민수", class_name: "1반", guardian_phone: "010-1111-2222", guardian_count: 1 },
            { student_id: 2, name: "김민수", class_name: "1반", guardian_phone: null, guardian_count: 0 },
          ],
        }),
      ),
    );

    const candidates = await searchStudentCandidates("김민수");

    expect(candidates.map((candidate) => candidate.detail)).toEqual(["1반 · 보호자 010-1111-2222", "1반 · 보호자 미연결"]);
  });
});
