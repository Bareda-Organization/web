import { afterEach, describe, expect, it, vi } from "vitest";
import { MalformedResponseError } from "@/shared/lib/http";
import { mockJsonResponse } from "@/shared/testing/httpResponse";
import { getMe } from "./me";

const validMe = {
  account_id: 1001,
  login_id: "staff1",
  name: "김관계",
  phone: "010-0000-0000",
  role: "staff",
  status: "active",
  academy: { id: 3, name: "바래다학원" },
  must_change_password: false,
};

const respond = (data: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(200, { success: true, data })));

// 새로고침 뒤 세션을 되살리는 유일한 조회라, 필드가 빠지거나 타입이 틀린 응답으로 세션을 만들지 않는다.
describe("getMe — 응답 검사", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("필수 필드가 다 있으면 camelCase 로 돌려준다", async () => {
    respond(validMe);

    await expect(getMe()).resolves.toMatchObject({ loginId: "staff1", role: "staff", mustChangePassword: false });
  });

  it.each([
    ["role 누락", { ...validMe, role: undefined }],
    ["알 수 없는 role", { ...validMe, role: "root" }],
    ["status 타입 오류", { ...validMe, status: 1 }],
    ["must_change_password 가 문자열", { ...validMe, must_change_password: "no" }],
    ["login_id 누락", { ...validMe, login_id: undefined }],
    ["data 가 객체가 아님", "nope"],
  ])("%s 이면 MalformedResponseError 를 던진다", async (_label, data) => {
    respond(data);

    await expect(getMe()).rejects.toBeInstanceOf(MalformedResponseError);
  });
});
