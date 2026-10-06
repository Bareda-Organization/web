import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_SURFACE_HEIGHT } from "./mapSurfaceSize";

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
      return /(?:^|\s)(?:min-|max-)?height:\s*(320|480|960)px/m.test(source);
    });

    expect(offenders).toEqual([]);
  });

  // 2026-09-23 사용자 지시 — "화면 절반 이상은 채워줘. 모든 지도에 해당". 고정 픽셀이면 큰 모니터에서
  // 지도가 화면의 1/3 에 그친다. 화면 높이 비율로 정하되, 작은 창에서 노선이 잘리지 않게 480px 아래로는 안 내린다.
  // 2026-10-06 — 리디자인 화면(오늘 현황 330px · 운행 상세 430px)이 숫자를 박아 상수 변경이 닿지 않았다.
  // 위 검사는 320·480 만 찾아 이 둘을 놓쳤다. 지도 칸을 정의한 곳은 전부 상수를 쓰게 한다.
  it("지도 칸(StyledMapSurface)은 전부 이 상수로 높이를 정한다", () => {
    const offenders = styledFiles().filter((path) => {
      const block = /export const StyledMapSurface = styled\.div`([^`]*)`/.exec(readFileSync(path, "utf8"))?.[1];
      return block !== undefined && !block.includes("${MAP_SURFACE_HEIGHT}");
    });

    expect(offenders).toEqual([]);
  });

  // 2026-10-06 사용자 지시 — "화면의 50프로 정도의 세로 길이로". 작은 창에서 노선이 잘리지 않게 480px 아래로는 안 내린다.
  it("화면 높이의 50% 이고, 작은 창에서도 480px 아래로 내려가지 않는다", () => {
    expect(MAP_SURFACE_HEIGHT).toBe("max(480px, 50vh)");
  });
});
