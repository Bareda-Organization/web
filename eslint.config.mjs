import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// 기능 → 그 기능이 읽어도 되는 다른 기능 — `src/features/managementFeaturesImportBoundary.test.ts` 의 목록과 같아야 한다.
// 시험은 import 문을 글자로 훑고, 이 규칙은 편집기·`npm run lint` 에서 같은 위반을 바로 알린다.
const ALLOWED_FEATURE_IMPORTS = {
  academy: [],
  auth: [],
  emergency: ["auth"],
  map: [],
  notification: [],
  onboarding: [],
  report: ["run"],
  approval: ["map"],
  student: ["auth"],
  schedule: ["bus"],
  route: ["bus", "schedule", "map"],
  bus: [],
  manager: ["auth"],
  admin: ["map", "route", "auth"],
  run: ["map", "route", "auth"],
};

const TESTS = ["**/*.test.{ts,tsx}"];
const DEEP_IMPORT = {
  group: ["@/features/*/*"],
  message: "다른 기능의 내부 파일을 직접 가리키지 않는다 — `@/features/<기능>` 공개 창구(index.ts)로 읽는다.",
};
const restrictImports = (...patterns) => ({ "no-restricted-imports": ["error", { patterns }] });

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 앱 코드는 콘솔 로그를 남기지 않는다 — 실패를 알리는 warn · error 만 허용한다. 시험은 측정값 출력(console.log)을 쓸 수 있어 뺀다.
  { ignores: TESTS, rules: { "no-console": ["error", { allow: ["warn", "error"] }] } },
  // 의존 방향(CONVENTIONS_REACT "지켜야 할 의존 방향"): 기능 내부 파일은 공개 창구로만 읽고, shared 는 기능을 읽지 않으며,
  // 기능끼리는 위 목록의 방향으로만 읽는다. 뒤 설정이 앞 설정의 같은 규칙을 통째로 바꾸므로 깊은 import 금지를 매번 함께 둔다.
  { files: ["src/**/*.{ts,tsx}"], ignores: TESTS, rules: restrictImports(DEEP_IMPORT) },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    ignores: TESTS,
    rules: restrictImports({ group: ["@/features", "@/features/**"], message: "shared 는 어느 기능도 import 하지 않는다 — 기능이 shared 를 읽는 한 방향이다." }),
  },
  ...Object.entries(ALLOWED_FEATURE_IMPORTS).map(([feature, allowed]) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    ignores: TESTS,
    rules: restrictImports(DEEP_IMPORT, {
      group: Object.keys(ALLOWED_FEATURE_IMPORTS)
        .filter((other) => other !== feature && !allowed.includes(other))
        .map((other) => `@/features/${other}`),
      message: `${feature} 기능은 이 기능을 import 하지 않는다 — 허용 방향은 eslint.config.mjs 의 ALLOWED_FEATURE_IMPORTS 에 있다.`,
    }),
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design-system/**", // 디자인 시스템 사본 — 읽기 전용이라 lint 하지 않는다
  ]),
]);

export default eslintConfig;
