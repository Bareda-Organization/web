import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 렌더마다 새 `useRouter` 객체를 주는 가짜를 시험 파일에 다시 쓰면 실패한다 — 공용 `createStableRouter` 를 쓴다.
// (고정하지 않은 가짜는 `router` 를 의존성에 둔 effect 를 렌더마다 다시 예약해 간헐 실패를 만든다 — R46-ADDR)
const SRC_DIR = path.resolve(__dirname, "../..");
const FRESH_ROUTER_PATTERN = /useRouter:\s*\(\)\s*=>\s*\(\{/;

const testFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return testFiles(full);
    return /\.test\.(ts|tsx)$/.test(name) ? [full] : [];
  });

describe("useRouter 시험 가짜", () => {
  it("렌더마다 새 객체를 주는 가짜를 시험 파일이 쓰지 않는다", () => {
    const offenders = testFiles(SRC_DIR)
      .filter((file) => FRESH_ROUTER_PATTERN.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC_DIR, file));
    expect(offenders).toEqual([]);
  });
});
