import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_SURFACE_HEIGHT_PX } from "./mapSurfaceSize";

// 2026-09-22 사용자 지시 — "모든 지도 크기는 통일". 화면마다 styled 파일에 숫자를 적어 두면
// 다음 화면이 또 제 값을 적어 갈린다(실제로 480 과 320 으로 갈려 있었다). 상수 한 곳만 쓰게 고정한다.
describe("지도 높이는 한 곳에서만 정한다", () => {
  const featureRoot = join(process.cwd(), "src/features");

  const styledFiles = (): string[] => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith(".styled.ts")) found.push(path);
      }
    };
    walk(featureRoot);
    return found;
  };

  it("styled 파일이 지도 높이를 숫자로 박지 않는다", () => {
    const offenders = styledFiles().filter((path) => {
      const source = readFileSync(path, "utf8");
      return /(?:^|\s)(?:min-|max-)?height:\s*(320|480)px/m.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it("상수는 세 지도 화면이 쓰던 큰 쪽(480)이다 — 낮은 쪽은 노선 전체를 담을 때 잘렸다", () => {
    expect(MAP_SURFACE_HEIGHT_PX).toBe(480);
  });
});
