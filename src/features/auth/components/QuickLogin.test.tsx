// 배포 시험 빌드용 빠른 로그인 — 비밀번호 환경변수가 있을 때만 단추를 그리는가가 이 검사의 핵심이다.
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuickLogin } from "./QuickLogin";

const TEST_PASSWORD = "test-pass";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("QuickLogin", () => {
  it("비밀번호 환경변수가 없으면 아무것도 그리지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_QUICK_LOGIN_PASSWORD", "");
    const { container } = render(<QuickLogin onPick={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("비밀번호 환경변수가 있으면 역할별 단추 2개를 그린다", () => {
    vi.stubEnv("NEXT_PUBLIC_QUICK_LOGIN_PASSWORD", TEST_PASSWORD);
    render(<QuickLogin onPick={() => {}} />);
    expect(screen.getByTestId("quick-login-staffA")).toHaveTextContent("학원 관계자");
    expect(screen.getByTestId("quick-login-sysadmin")).toHaveTextContent("메인 관리자");
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("누르면 해당 아이디와 환경변수 비밀번호를 넘긴다", () => {
    vi.stubEnv("NEXT_PUBLIC_QUICK_LOGIN_PASSWORD", TEST_PASSWORD);
    const onPick = vi.fn();
    render(<QuickLogin onPick={onPick} />);

    fireEvent.click(screen.getByTestId("quick-login-staffA"));
    fireEvent.click(screen.getByTestId("quick-login-sysadmin"));

    expect(onPick).toHaveBeenNthCalledWith(1, "staffA", TEST_PASSWORD);
    expect(onPick).toHaveBeenNthCalledWith(2, "sysadmin", TEST_PASSWORD);
  });
});
