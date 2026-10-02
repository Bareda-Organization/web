import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Ruling 780 — 런타임 Node 주 버전은 네 곳이 같아야 한다: `.nvmrc` · `package.json` engines · Dockerfile · CI.
// 한 곳만 바꾸면 "로컬은 통과 · 배포만 다른 버전" 이 된다(Node 22 → 24 를 올릴 때 네 곳을 손으로 맞췄다).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file: string): string => readFileSync(path.join(root, file), "utf-8");
const majorsIn = (text: string, pattern: RegExp): number[] => [...text.matchAll(pattern)].map((match) => Number(match[1]));

describe("Node 주 버전 고정 — 네 곳이 같다", () => {
  it(".nvmrc · engines.node · Dockerfile · ci.yml 의 주 버전이 하나다", () => {
    const nvmrc = majorsIn(read(".nvmrc"), /^v?(\d+)/gm);
    const engines = majorsIn(String(JSON.parse(read("package.json")).engines?.node ?? ""), /^\D*(\d+)/g);
    const dockerfile = majorsIn(read("Dockerfile"), /^FROM node:(\d+)\./gm);
    const ci = majorsIn(read(".github/workflows/ci.yml"), /node-version:\s*(\d+)/g);

    // 정규식이 아무것도 못 집어 빈 배열끼리 "같다" 로 통과하는 일을 막는다.
    for (const found of [nvmrc, engines, dockerfile, ci]) expect(found.length).toBeGreaterThan(0);
    expect(new Set([...nvmrc, ...engines, ...dockerfile, ...ci]).size).toBe(1);
  });
});
