import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// F02-05 — `docs/frontend/CONVENTIONS_REACT.md` "지켜야 할 의존 방향": 기능끼리는 예외 목록의 방향으로만 import 하고,
// 다른 기능은 `features/<기능>/index.ts` 공개 창구로만 읽는다. 승인·학생·스케줄·노선·차량·매니저 6개 기능에 더해(X-02) 문서 예외 목록의 `admin`·`run` 도 검사한다.
const FEATURES_DIR = path.resolve(__dirname);
const CHECKED = ["approval", "student", "schedule", "route", "bus", "manager", "admin", "run"];
// 기능 → 그 기능이 읽어도 되는 다른 기능(문서 예외 목록과 같아야 한다).
const ALLOWED: Record<string, string[]> = {
  approval: ["map"],
  student: ["auth"],
  schedule: ["bus"],
  route: ["bus", "schedule", "map"],
  bus: [],
  manager: ["auth"],
  admin: ["map", "route", "auth"],
  run: ["map", "route", "auth"],
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : [];
  });

const featureImports = (file: string): { feature: string; deep: boolean; spec: string }[] =>
  [...readFileSync(file, "utf8").matchAll(/from\s+"@\/features\/([^"/]+)(\/[^"]*)?"/g)].map((match) => ({
    feature: match[1],
    deep: match[2] !== undefined,
    spec: match[0],
  }));

describe("승인·학생·스케줄·노선·차량·매니저·관리자 콘솔·운행 — 기능 간 import 경계(F02-05·X-02)", () => {
  const violations = CHECKED.flatMap((feature) =>
    sourceFiles(path.join(FEATURES_DIR, feature)).flatMap((file) =>
      featureImports(file)
        .filter(({ feature: target, deep }) => deep || (target !== feature && !ALLOWED[feature].includes(target)))
        .map(({ spec }) => `${path.relative(FEATURES_DIR, file)}: ${spec}`),
    ),
  );

  it("예외 목록 밖의 기능을 import 하지 않고, 다른 기능의 내부 파일을 직접 가리키지 않는다", () => {
    expect(violations).toEqual([]);
  });
});
