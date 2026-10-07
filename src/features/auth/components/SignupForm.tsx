"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, EmptyState, Input, SearchField } from "@/shared/ui";
import { searchAcademies, signup } from "../api";
import { useAuthSession } from "../hooks/useAuthSession";
import type { AcademySummaryResponseTypes } from "../types";
import { ACADEMY_SEARCH_ERROR, AcademyResultList } from "./AcademyResultList";
import { StyledMissingFields, StyledSelectedAcademy } from "./SignupForm.styled";
import { StyledBrand, StyledContainer, StyledFooter, StyledForm, StyledLayout, StyledLink, StyledWrapper } from "./LoginForm.styled";

// 관계자 웹의 가입 대상은 학원 관계자(staff) 뿐이다 — `IMPLEMENTATION_PLAN §1` 이 이 제품의
// 사용자를 "학원 관계자 + 메인 관리자"로만 못박고, 학부모·학생·기사·동승자는 별도 앱(Flutter)
// 몫이라 이 화면에 그 4개를 보여주면 잘못된 제품으로 유도하는 셈이 된다. 그래서 §2.2 가 여는
// 5개 역할 중 이 폼은 `staff` 하나로 고정하고 선택 UI 자체를 두지 않는다 — 판단 근거는
// 보고서 1항, 확신 90%로 적어 둔다(반대 근거가 나오면 뒤집을 여지가 있다는 뜻).
const SIGNUP_ROLE = "staff" as const;

// §2.2 — login_id 50자 이하 · 비밀번호 UTF-8 72바이트 이하(한글 24자). 넘으면 서버가 422 를 낸다.
const LOGIN_ID_MAX_LENGTH = 50;
const PASSWORD_MAX_BYTES = 72;

type SignupFormState =
  | { kind: "idle" }
  | { kind: "duplicate-login-id" }
  // 가입은 끝났는데 뒤이은 로그인이 실패 — 다시 제출하면 DUPLICATE_LOGIN_ID 를 맞으므로 로그인으로 안내한다.
  | { kind: "signed-up-login-failed" }
  | { kind: "unknown"; message: string };

const validate = (name: string, phone: string, loginId: string, password: string): string | null => {
  if (name.trim() === "" || phone.trim() === "") return "이름과 연락처를 입력해 주세요.";
  if (loginId.trim() === "" || password === "") return "아이디와 비밀번호를 입력해 주세요.";
  if (loginId.length > LOGIN_ID_MAX_LENGTH) return `아이디는 ${LOGIN_ID_MAX_LENGTH}자 이하로 입력해 주세요.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "비밀번호는 한글 24자(영문·숫자 72자) 이하로 입력해 주세요.";
  return null;
};

export const SignupForm = () => {
  const router = useRouter();
  const { login } = useAuthSession();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AcademySummaryResponseTypes[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedAcademy, setSelectedAcademy] = useState<AcademySummaryResponseTypes | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<SignupFormState>({ kind: "idle" });

  // UF-X-01 — 제출 버튼 아래에 아직 비어 있는 항목 이름을 보인다(공백만 넣은 칸도 빈 것으로 센다).
  const missingFields = [
    name.trim() === "" ? "이름" : null,
    phone.trim() === "" ? "연락처" : null,
    loginId.trim() === "" ? "아이디" : null,
    password === "" ? "비밀번호" : null,
    selectedAcademy === null ? "학원" : null,
  ].filter((field): field is string => field !== null);

  const handleSearchSubmit = async (value: string) => {
    setSearched(true);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    try {
      setResults(await searchAcademies(value.trim()));
      setState({ kind: "idle" });
    } catch {
      setResults([]);
      setSearched(false);
      setState({ kind: "unknown", message: ACADEMY_SEARCH_ERROR });
    }
  };

  const handleSubmitClick = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAcademy) {
      return;
    }
    const invalid = validate(name, phone, loginId, password);
    if (invalid) {
      setState({ kind: "unknown", message: invalid });
      return;
    }
    setSubmitting(true);
    setState({ kind: "idle" });
    try {
      await signup({
        role: SIGNUP_ROLE,
        loginId,
        password,
        name,
        phone,
        academyId: selectedAcademy.id,
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "DUPLICATE_LOGIN_ID") {
        setState({ kind: "duplicate-login-id" });
      } else if (error instanceof ApiError) {
        setState({ kind: "unknown", message: error.message });
      } else {
        setState({ kind: "unknown", message: "가입에 실패했습니다. 잠시 후 다시 시도해 주세요." });
      }
      setSubmitting(false);
      return;
    }
    // §2.2 응답은 토큰을 안 준다 — 대기 화면 진입은 같은 자격으로 바로 로그인해서 만든다.
    // 세션이 채워지면 AuthGateGuard 가 pending 상태를 보고 /signup-status 로 옮긴다.
    // 가입은 이미 끝났으므로 로그인이 실패해도 "가입 실패" 로 안내하지 않는다(다시 제출하면 DUPLICATE_LOGIN_ID).
    try {
      await login(loginId, password);
      router.replace("/signup-status");
    } catch {
      setState({ kind: "signed-up-login-failed" });
      return;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StyledLayout>
      <StyledContainer>
        <StyledWrapper>
          <StyledBrand>BARAEDA</StyledBrand>

          {state.kind === "duplicate-login-id" ? (
            <AlertBanner tone="missed" title="이미 쓰이고 있는 아이디입니다">
              다른 아이디로 다시 입력해 주세요.
            </AlertBanner>
          ) : null}
          {state.kind === "signed-up-login-failed" ? (
            <AlertBanner
              tone="info"
              title="가입 신청은 접수됐습니다"
              action={<StyledLink href="/login">로그인 화면으로</StyledLink>}
            >
              자동 로그인에 실패했습니다. 로그인 화면에서 방금 만든 아이디로 로그인해 주세요. 다시 가입 신청을 보내면 이미 쓰이는 아이디로 거절됩니다.
            </AlertBanner>
          ) : null}
          {state.kind === "unknown" ? <AlertBanner tone="missed">{state.message}</AlertBanner> : null}

          <StyledForm onSubmit={handleSubmitClick}>
            <Input label="이름" required value={name} onChange={(event) => setName(event.target.value)} />
            <Input
              label="연락처"
              required
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Input
              label="아이디"
              required
              autoComplete="username"
              maxLength={LOGIN_ID_MAX_LENGTH}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
            />
            <Input
              label="비밀번호"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <SearchField
              inForm
              placeholder="학원명 또는 학원 코드로 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onSubmit={handleSearchSubmit}
            />

            {selectedAcademy ? (
              <StyledSelectedAcademy>
                선택한 학원 — {selectedAcademy.name} · {selectedAcademy.region} · {selectedAcademy.code}
              </StyledSelectedAcademy>
            ) : null}

            {searched && results.length === 0 ? (
              <EmptyState icon="search" title="검색 결과가 없습니다">
                학원명 또는 학원 코드를 다시 확인해 주세요.
              </EmptyState>
            ) : null}

            {results.length > 0 ? (
              <AcademyResultList results={results} selectedId={selectedAcademy?.id} onPick={setSelectedAcademy} />
            ) : null}

            <Button type="submit" size="lg" block disabled={submitting || !selectedAcademy || state.kind === "signed-up-login-failed"}>
              가입 신청
            </Button>
            {missingFields.length > 0 ? <StyledMissingFields>아직 채우지 않은 항목 · {missingFields.join(" · ")}</StyledMissingFields> : null}
          </StyledForm>

          <StyledFooter>
            이미 계정이 있으신가요? <StyledLink href="/login">로그인</StyledLink>
          </StyledFooter>
        </StyledWrapper>
      </StyledContainer>
    </StyledLayout>
  );
};
