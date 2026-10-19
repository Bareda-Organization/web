import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_SURFACE_HEIGHT } from "./mapSurfaceSize";

// 화면마다 styled 파일에 숫자를 적으면 각 화면이 제 값으로 갈린다. 상수 한 곳만 쓰게 고정한다.
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

  // 지도 칸(StyledMapSurface)은 숫자를 박지 않고 전부 이 상수를 쓴다.
  // 앞 검사는 320·480·960 만 찾으므로, 다른 숫자로 적힌 칸도 이 검사가 잡는다.
  it("지도 칸(StyledMapSurface)은 전부 이 상수로 높이를 정한다", () => {
    const offenders = styledFiles().filter((path) => {
      const block = /export const StyledMapSurface = styled\.div`([^`]*)`/.exec(readFileSync(path, "utf8"))?.[1];
      return block !== undefined && !block.includes("${MAP_SURFACE_HEIGHT}");
    });

    expect(offenders).toEqual([]);
  });

  // 화면 높이의 50% 이되, 작은 창에서 노선이 잘리지 않게 480px 아래로는 내리지 않는다.
  it("화면 높이의 50% 이고, 작은 창에서도 480px 아래로 내려가지 않는다", () => {
    expect(MAP_SURFACE_HEIGHT).toBe("max(480px, 50vh)");
  });
});
