"use client";

import { useEffect, useState } from "react";
import { AlertBanner, Button, Card, EmptyState, SearchField } from "@/shared/ui";
import { getSignupStatus, reapplySignup, searchAcademies } from "../api";
import { useAuthSession } from "../hooks/useAuthSession";
import type { AcademySummaryResponseTypes, SignupStatusResponseTypes } from "../types";
import { StyledResultItem, StyledResultList, StyledResultMeta } from "./SignupForm.styled";
import { StyledActions, StyledContainer, StyledField, StyledFieldList, StyledLayout, StyledTitle, StyledWrapper } from "./SignupStatusPanel.styled";

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
};

// 승인 대기 · 거절 화면 (UF-X-02). pending 은 문의처만, rejected 는 사유 + 재신청 진입점까지 보여준다.
export const SignupStatusPanel = () => {
  const { logout, refreshSession } = useAuthSession();
  const [status, setStatus] = useState<SignupStatusResponseTypes | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reapplying, setReapplying] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AcademySummaryResponseTypes[]>([]);
  const [searched, setSearched] = useState(false);
  const [reapplyError, setReapplyError] = useState<string | null>(null);

  // AuthSessionProvider 의 부트스트랩 effect 와 같은 형태 — 인라인 IIFE 로 두어야
  // `react-hooks/set-state-in-effect` 가 "effect 본문에서 곧장 setState" 로 오판하지 않는다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getSignupStatus();
        if (!cancelled) {
          setStatus(next);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("승인 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadStatus = async () => {
    try {
      const next = await getSignupStatus();
      setStatus(next);
      setLoadError(null);
    } catch {
      setLoadError("승인 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleSearchSubmit = async (value: string) => {
    setSearched(true);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setResults(await searchAcademies(value.trim()));
  };

  const handleReapplyClick = async (academyId: string) => {
    setReapplyError(null);
    try {
      await reapplySignup(academyId);
      await refreshSession();
      await reloadStatus();
      setReapplying(false);
    } catch {
      setReapplyError("재신청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleLogoutClick = async () => {
    await logout();
  };

  if (loadError) {
    return (
      <StyledLayout>
        <StyledContainer>
          <AlertBanner
            tone="missed"
            action={
              <Button size="sm" variant="secondary" onClick={reloadStatus}>
                다시 시도
              </Button>
            }
          >
            {loadError}
          </AlertBanner>
        </StyledContainer>
      </StyledLayout>
    );
  }

  if (!status) {
    return <StyledLayout aria-busy="true" />;
  }

  const isRejected = status.status === "rejected";

  return (
    <StyledLayout>
      <StyledContainer>
        <StyledWrapper>
          <Card>
            <StyledTitle>{isRejected ? "가입이 거절됐습니다" : "승인 대기 중입니다"}</StyledTitle>
            <StyledFieldList>
              <StyledField>
                <span>신청 학원</span>
                <span>
                  {status.academy.name} · {status.academy.region} · {status.academy.code}
                </span>
              </StyledField>
              <StyledField>
                <span>신청 일시</span>
                <span>{formatDateTime(status.requestedAt)}</span>
              </StyledField>
              <StyledField>
                <span>학원 문의처</span>
                <span>{status.academyContact}</span>
              </StyledField>
            </StyledFieldList>
          </Card>

          {isRejected ? (
            <AlertBanner tone="missed" title="거절 사유">
              {status.rejectReason || "사유가 등록되지 않았습니다. 학원 문의처로 확인해 주세요."}
            </AlertBanner>
          ) : null}

          {isRejected && !reapplying ? (
            <Button variant="secondary" size="lg" block onClick={() => setReapplying(true)}>
              다른 학원으로 재신청
            </Button>
          ) : null}

          {isRejected && reapplying ? (
            <StyledActions>
              {reapplyError ? <AlertBanner tone="missed">{reapplyError}</AlertBanner> : null}
              <SearchField
                placeholder="학원명 또는 학원 코드로 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onSubmit={handleSearchSubmit}
              />
              {searched && results.length === 0 ? (
                <EmptyState icon="search" title="검색 결과가 없습니다">
                  학원명 또는 학원 코드를 다시 확인해 주세요.
                </EmptyState>
              ) : null}
              {results.length > 0 ? (
                <StyledResultList>
                  {results.map((academy) => (
                    <StyledResultItem
                      key={academy.id}
                      $selected={false}
                      onClick={() => void handleReapplyClick(academy.id)}
                    >
                      {academy.name}
                      <StyledResultMeta>
                        {academy.region} · {academy.code}
                      </StyledResultMeta>
                    </StyledResultItem>
                  ))}
                </StyledResultList>
              ) : null}
            </StyledActions>
          ) : null}

          <Button variant="ghost" size="lg" block onClick={handleLogoutClick}>
            로그아웃
          </Button>
        </StyledWrapper>
      </StyledContainer>
    </StyledLayout>
  );
};
