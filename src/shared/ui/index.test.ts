import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as UI from "./index";

// FE-R2 W 목표 3 — 배럴 파일 상단 주석의 컴포넌트 개수("29개")가 실제 export 수(31개)와
// 어긋나 있었다. 숫자만 고쳐 적으면 다음에 또 낡으므로, 주석의 숫자를 실제 export 수와
// 대조하는 검사로 고정한다 — 컴포넌트를 추가·삭제하고 주석을 안 고치면 이 검사가 실패한다.
describe("shared/ui 배럴 — 주석의 컴포넌트 개수", () => {
  it("주석에 적힌 개수가 실제 export 수와 일치한다", () => {
    const source = readFileSync(path.resolve(__dirname, "index.ts"), "utf-8");
    const match = source.match(/컴포넌트\s*(\d+)개/);
    expect(match).not.toBeNull();
    const claimedCount = Number(match![1]);

    // export type 은 트랜스파일 후 런타임 바인딩을 남기지 않으므로, 값(컴포넌트) export 만 남는다.
    const actualCount = Object.keys(UI).length;

    expect(claimedCount).toBe(actualCount);
  });
});
