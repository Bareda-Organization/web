import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// F4-B W 목표 4 — 지도 SDK(네이버 지도 v3, `naver.maps.*`)는 포트/어댑터 뒤에 숨겨야
// 한다(`IMPLEMENTATION_PLAN.md §8.3.1`). 화면(features/admin·features/run)이 SDK
// 타입을 직접 알게 되면 지도 공급자를 바꿀 때 화면 코드까지 고쳐야 한다 — 이 검사는
// `features/map/naver/` 바깥의 소스 어디에도 SDK 참조가 없는지를 파일을 직접 읽어 확인한다.
const SRC_ROOT = path.resolve(__dirname, "..", "..");
const ADAPTER_DIR = path.resolve(__dirname, "naver");
const PUBLIC_WRAPPER = path.resolve(__dirname, "MapSurface.tsx");

// 네이버 지도 v3 SDK 의 전역 네임스페이스 — `naver.maps.Map` 처럼 SDK 타입·값을
// 직접 참조할 때만 나타난다.
const SDK_TOKEN = /\bnaver\.maps\./;

// 어댑터 구현 폴더를 경로 문자열로 직접 가져오는 import — 공개 표면(`MapSurface.tsx`)
// 을 우회해 구현 세부사항에 바로 접근하는 것을 막는다.
const ADAPTER_IMPORT = /from\s+["'].*\/naver\/NaverMapSurface["']/;

// 주석 안의 설명 문자열("naver.maps.* 를 참조하지 않는다" 같은 문서화)까지 코드
// 참조로 오탐하지 않도록, 검사 전에 라인·블록 주석을 걷어낸다.
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules") continue;
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }
  return files;
};

describe("features/map 경계 — SDK 타입은 naver/ 폴더 밖으로 새지 않는다", () => {
  it("features/map/naver/ 바깥의 모든 소스 파일에 naver.maps 참조가 없다", () => {
    const violations: string[] = [];
    for (const filePath of collectSourceFiles(SRC_ROOT)) {
      if (filePath.startsWith(ADAPTER_DIR)) continue;
      const source = stripComments(readFileSync(filePath, "utf-8"));
      if (SDK_TOKEN.test(source)) {
        violations.push(path.relative(SRC_ROOT, filePath));
      }
    }
    expect(violations).toEqual([]);
  });

  it("MapSurface.tsx 를 제외한 어떤 파일도 naver/NaverMapSurface 를 직접 import 하지 않는다", () => {
    const violations: string[] = [];
    for (const filePath of collectSourceFiles(SRC_ROOT)) {
      if (filePath.startsWith(ADAPTER_DIR) || filePath === PUBLIC_WRAPPER) continue;
      const source = stripComments(readFileSync(filePath, "utf-8"));
      if (ADAPTER_IMPORT.test(source)) {
        violations.push(path.relative(SRC_ROOT, filePath));
      }
    }
    expect(violations).toEqual([]);
  });
});
