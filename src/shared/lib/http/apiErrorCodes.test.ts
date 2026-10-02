import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { API_ERROR_CODES } from "./apiErrorCodes";

// W10 — 이 파일 머리 주석 "정본과 대조해 갱신"을 사람 손에 맡기지 않는다. `docs/API_SPEC.md`
// §8(에러 코드 사전)의 표 첫 열을 직접 파싱해 이 파일의 사전과 양방향으로 대조한다 — 누락(§8 에는 있고 목록에 없음)과
// 잔재(목록에는 있고 §8 에서 지워짐 — R46-LATERRT 가 찾은 `DUPLICATE_NOTIFICATION`) 둘 다 이 시험이 실패로 알린다.
// 사양은 backend 저장소에 있다(2026-10-02 저장소 분리) — 로컬은 형제 clone(`../backend`), CI 는 `API_SPEC_PATH` 로 받는다.
// 파일이 없으면 건너뛰지 않고 실패한다: 건너뛰면 사양과 어긋나도 아무도 모른다.
const specPath =
  process.env.API_SPEC_PATH ??
  path.resolve(fileURLToPath(import.meta.url), "../../../../../../backend/docs/API_SPEC.md");

const codesFromSpec = (): string[] => {
  const text = readFileSync(specPath, "utf-8");
  const section = text.slice(text.indexOf("\n## 8. "), text.indexOf("\n## 9. "));
  const codes: string[] = [];
  for (const line of section.split("\n")) {
    // 표의 첫 열만 — `| \`CODE\` | ...` 형태. 폐지 표기(`~~CODE~~`)는 첫 열이
    // `~~` 로 시작해 이 정규식에 안 걸린다(코드가 아니라 그 뒤 백틱 문자열이 대상).
    const match = /^\|\s*`([A-Z_]+)`/.exec(line);
    if (match) codes.push(match[1]);
  }
  return [...new Set(codes)];
};

describe("apiErrorCodes — API_SPEC §8 대조", () => {
  it("§8 표에 있는 코드가 이 파일에도 전부 있다", () => {
    const missing = codesFromSpec().filter((code) => !(API_ERROR_CODES as readonly string[]).includes(code));
    expect(missing).toEqual([]);
  });

  it("이 파일에 있는 코드가 §8 표에도 전부 있다 — 서버·사양에서 지워진 코드가 남아 있지 않다", () => {
    const inSpec = new Set(codesFromSpec());
    const leftover = API_ERROR_CODES.filter((code) => !inSpec.has(code));
    expect(leftover).toEqual([]);
  });
});
