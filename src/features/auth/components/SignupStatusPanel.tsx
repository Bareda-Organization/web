"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { AlertBanner, Button, Card, Dialog, EmptyState, SearchField } from "@/shared/ui";
import { getSignupStatus, reapplySignup, searchAcademies } from "../api";
import { useAuthSession } from "../hooks/useAuthSession";
import type { AcademySummaryResponseTypes, SignupStatusResponseTypes } from "../types";
import { ACADEMY_SEARCH_ERROR, AcademyResultList } from "./AcademyResultList";
import { StyledActions, StyledContainer, StyledField, StyledFieldList, StyledLayout, StyledTitle, StyledWrapper } from "./SignupStatusPanel.styled";

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
  // 결과 행을 누르면 바로 보내지 않고 확인을 한 번 거친다 — pending 이 되면 되돌릴 수단이 없다(§2.4).
  const [reapplyTarget, setReapplyTarget] = useState<AcademySummaryResponseTypes | null>(null);
  const [rechecking, setRechecking] = useState(false);

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
    try {
      setResults(await searchAcademies(value.trim()));
      setReapplyError(null);
    } catch {
      setResults([]);
      setSearched(false);
      setReapplyError(ACADEMY_SEARCH_ERROR);
    }
  };

  const handleReapplyConfirm = async () => {
    if (!reapplyTarget) return;
    setReapplyError(null);
    try {
      await reapplySignup(reapplyTarget.id);
    } catch {
      setReapplyTarget(null);
      setReapplyError("재신청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    // 신청은 이미 들어갔다 — 뒤이은 세션·상태 재조회가 일시적으로 실패해도 "재신청 실패" 로 안내하지 않는다.
    setReapplyTarget(null);
    setReapplying(false);
    await refreshSession().catch(() => {});
    await reloadStatus();
  };

  // UF-X-02 [상태 다시 확인] — 세션(/me)을 먼저 갱신해 승인(active)이면 가드가 역할별 홈으로 옮기게 하고, 가입 상태도 다시 읽는다.
  const handleRecheck = async () => {
    setRechecking(true);
    try {
      await refreshSession().catch(() => {});
      await reloadStatus();
    } finally {
      setRechecking(false);
    }
  };

  const handleLogoutClick = () => {
    void logout().catch(() => {});
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
  const isApproved = status.status === "active";

  return (
    <StyledLayout>
      <StyledContainer>
        <StyledWrapper>
          <Card>
            <StyledTitle>{isRejected ? "가입이 거절됐습니다" : isApproved ? "승인되었습니다" : "승인 대기 중입니다"}</StyledTitle>
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
                <span>{status.academyContact ?? "등록된 문의처 없음"}</span>
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
                inForm
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
              {results.length > 0 ? <AcademyResultList results={results} onPick={setReapplyTarget} /> : null}
            </StyledActions>
          ) : null}

          <Button variant="secondary" size="lg" block disabled={rechecking} onClick={handleRecheck}>
            상태 다시 확인
          </Button>

          <Button variant="ghost" size="lg" block onClick={handleLogoutClick}>
            로그아웃
          </Button>
          {reapplyTarget ? (
            <Dialog
              title="이 학원으로 재신청할까요?"
              onClose={() => setReapplyTarget(null)}
              footer={
                <>
                  <Button variant="ghost" onClick={() => setReapplyTarget(null)}>
                    취소
                  </Button>
                  <Button onClick={() => void handleReapplyConfirm()}>재신청</Button>
                </>
              }
            >
              {reapplyTarget.name} · {reapplyTarget.region} · {reapplyTarget.code}
              <br />
              재신청하면 승인 대기 상태가 되고, 되돌릴 수 없습니다.
            </Dialog>
          ) : null}
        </StyledWrapper>
      </StyledContainer>
    </StyledLayout>
  );
};
