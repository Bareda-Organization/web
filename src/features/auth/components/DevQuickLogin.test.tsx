// 개발용 빠른 로그인 — **운영 빌드에 새지 않는가**가 이 검사의 전부다.
//
// 시드 비밀번호를 상수로 들고 있는 컴포넌트라, 운영에서 그려지면 그 문자열과 계정 목록이
// 그대로 노출된다. 편의 기능이지만 새는 쪽의 대가가 커서 검사를 붙인다.
import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DevQuickLogin } from "./DevQuickLogin";

const setNodeEnv = (value: string) => {
  vi.stubEnv("NODE_ENV", value);
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DevQuickLogin", () => {
  it("운영 빌드에서는 아무것도 그리지 않는다", () => {
    setNodeEnv("production");
    const { container } = render(<DevQuickLogin onPick={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("개발 빌드에서는 시드 계정 단추를 그린다", () => {
    setNodeEnv("development");
    render(<DevQuickLogin onPick={() => {}} />);
    expect(screen.getByTestId("dev-login-staffA")).toBeInTheDocument();
    expect(screen.getByTestId("dev-login-sysadmin")).toBeInTheDocument();
  });

  it("누르면 아이디와 시드 비밀번호를 함께 넘긴다", () => {
    setNodeEnv("development");
    const onPick = vi.fn();
    render(<DevQuickLogin onPick={onPick} />);

    fireEvent.click(screen.getByTestId("dev-login-staffA"));

    // ⚠ 비밀번호까지 확인한다 — 아이디만 넘기면 호출부가 빈 비밀번호로 제출해
    // 로그인 시도 횟수만 축내고 원인이 안 보인다.
    expect(onPick).toHaveBeenCalledWith("staffA", "password");
  });

  it("관계자 웹이 받지 않는 역할은 싣지 않는다", () => {
    setNodeEnv("development");
    render(<DevQuickLogin onPick={() => {}} />);
    // 학부모·기사로 로그인하면 AuthGateGuard 가 /login 으로 되돌려보낸다 —
    // 단추를 두면 "눌렀는데 아무 일도 안 난다" 로 보인다.
    expect(screen.queryByTestId("dev-login-parentA1")).toBeNull();
    expect(screen.queryByTestId("dev-login-driverA1")).toBeNull();
  });
});
