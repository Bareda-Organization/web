"use client";

import { useState } from "react";

import { ApiError } from "@/shared/lib/http";
import { AppOnlyRoleError } from "../lib/appOnlyRole";
import { AlertBanner, Button, Input } from "@/shared/ui";
import { useAuthSession } from "../hooks/useAuthSession";
import { StyledBrand, StyledContainer, StyledFooter, StyledForm, StyledLayout, StyledLink, StyledWrapper } from "./LoginForm.styled";

// 로그인 실패 상태 — 화면에 보일 문구까지 여기서 결정한다. AUTH_ACCOUNT_BLOCKED 는
// 별도 라우트를 만들지 않고 이 화면 안에서 차단 안내(UF-X-04)를 인라인으로 보여준다
// (판단 근거는 보고서 1항 — 로그인 자체가 실패하는 사건이라 화면 전환이 아니라
// 같은 폼 위에서 이유를 밝히는 쪽이 §1.4 의 "로그인 자체가 실패" 설명과 더 맞는다).
type LoginFormState =
  | { kind: "idle" }
  | { kind: "invalid-credentials"; remainingAttempts?: number }
  | { kind: "blocked" }
  | { kind: "staff-inactive" }
  | { kind: "app-only" }
  | { kind: "unknown"; message: string };

export const LoginForm = () => {
  const { login } = useAuthSession();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<LoginFormState>({ kind: "idle" });

  const submit = async () => {
    setSubmitting(true);
    setState({ kind: "idle" });
    try {
      await login(loginId, password);
      // 이동은 여기서 하지 않는다 — AuthGateGuard 가 세션 변화를 보고 한 곳에서 판정한다.
    } catch (error) {
      if (error instanceof AppOnlyRoleError) {
        setState({ kind: "app-only" });
      } else if (error instanceof ApiError) {
        if (error.code === "INVALID_CREDENTIALS") {
          const remaining = error.details?.remaining_attempts;
          setState({
            kind: "invalid-credentials",
            remainingAttempts: typeof remaining === "number" ? remaining : undefined,
          });
        } else if (error.code === "AUTH_ACCOUNT_BLOCKED") {
          setState({ kind: "blocked" });
        } else if (error.code === "AUTH_STAFF_INACTIVE") {
          setState({ kind: "staff-inactive" });
        } else {
          setState({ kind: "unknown", message: error.message });
        }
      } else {
        setState({ kind: "unknown", message: "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <StyledLayout>
      <StyledContainer>
        <StyledWrapper>
          <StyledBrand>BARAEDA</StyledBrand>

          {state.kind === "invalid-credentials" ? (
            <AlertBanner tone="missed" title="아이디 또는 비밀번호가 올바르지 않습니다">
              {typeof state.remainingAttempts === "number"
                ? `이 계정은 앞으로 ${state.remainingAttempts}회 더 실패하면 잠깁니다.`
                : "다시 확인하고 입력해 주세요."}
            </AlertBanner>
          ) : null}

          {state.kind === "blocked" ? (
            <AlertBanner tone="missed" title="이 계정은 잠겨 있습니다">
              로그인 실패가 5회 누적돼 계정 단위로 잠겼습니다. 다른 기기나 다른 사람의 접속과는
              무관합니다. 잠금 해제는 메인 관리자에게 문의해 주세요.
            </AlertBanner>
          ) : null}

          {state.kind === "staff-inactive" ? (
            <AlertBanner tone="missed" title="퇴사 처리된 계정입니다">
              학원 관계자 퇴사 처리로 접근이 제한됐습니다. 메인 관리자에게 문의해 주세요.
            </AlertBanner>
          ) : null}

          {state.kind === "app-only" ? (
            <AlertBanner tone="missed" title="학부모·학생·매니저는 앱을 이용해 주세요">
              이 웹 화면은 학원 관계자와 메인 관리자 전용입니다. 앱을 설치해 같은 계정으로 로그인해 주세요.
            </AlertBanner>
          ) : null}

          {state.kind === "unknown" ? <AlertBanner tone="missed">{state.message}</AlertBanner> : null}

          <StyledForm onSubmit={handleSubmitClick}>
            <Input
              label="아이디"
              required
              autoComplete="username"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
            />
            <Input
              label="비밀번호"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" size="lg" block disabled={submitting}>
              로그인
            </Button>
          </StyledForm>

          <StyledFooter>
            계정이 없으신가요? <StyledLink href="/signup">회원가입</StyledLink>
          </StyledFooter>
          {/* Ruling 329 — 전화번호 복구(§2.9)는 SMS 연동 전까지 닫혀 있어 관리자 경유만 연다. */}
          <StyledFooter>
            비밀번호를 잊으셨나요? 관계자 계정은 메인 관리자에게 초기화를 요청해 주세요.
          </StyledFooter>
        </StyledWrapper>
      </StyledContainer>
    </StyledLayout>
  );
};
