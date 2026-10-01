import { vi } from "vitest";

// 시험용 `useRouter` 가짜 — 렌더가 바뀌어도 같은 객체를 돌려주도록 한 번 만들어 둔다.
// 실제 `useRouter` 는 같은 객체를 주는데, 가짜가 렌더마다 새 객체를 주면 `router` 를 의존성에 둔 effect 가
// 렌더 때마다 다시 예약돼 주소를 바꾸는 시험이 "아직 실행되지 않은 옛 effect" 와 경합한다(간헐 실패 — R46-ADDR).
//
//   const mockRouter = createStableRouter({ push: mockPush });
//   vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
//
// 앱 코드는 이 파일을 부르지 않는다(시험 전용) — `realBackendTarget.ts` 와 같은 경계.
export const createStableRouter = (overrides: Partial<Record<StableRouterMethod, ReturnType<typeof vi.fn>>> = {}) => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  ...overrides,
});

type StableRouterMethod = "push" | "replace" | "back" | "forward" | "refresh" | "prefetch";
