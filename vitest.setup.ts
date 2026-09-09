import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// vitest 는 test.globals 를 켜지 않는 한 afterEach 를 전역에 붙이지 않는다 —
// testing-library 의 자동 언마운트가 이 전역을 찾아 동작하므로 여기서 직접 등록한다.
// 안 하면 컴포넌트 테스트가 이전 렌더와 겹쳐 "요소가 여러 개" 로 오검출된다.
afterEach(cleanup);
