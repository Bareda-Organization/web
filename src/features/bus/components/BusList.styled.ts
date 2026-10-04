import styled from "@emotion/styled";

export const StyledBusLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

// 좌석 구성 — 막대(학생 · 기사 · 동승 칸) + 정원 숫자, 아래에 풀어 쓴 구성.
export const StyledSeatCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 190px;
`;

export const StyledSeatBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--fw-bold) var(--fs-sm) / 1.2 var(--font-sans);
  font-variant-numeric: tabular-nums;
`;

// 칸 하나가 좌석 하나 — 학생 칸은 하나로 이어 그리고, 기사·동승은 짧은 칸으로 끊는다.
export const StyledSeatTrack = styled.span`
  display: flex;
  gap: 2px;
  width: 132px;
  height: 8px;
`;

export const StyledSeatSegment = styled.span<{ $kind: "student" | "reserved"; $flex: number }>`
  flex: ${(p) => p.$flex} 1 0;
  border-radius: 4px;
  background: ${(p) => (p.$kind === "student" ? "var(--green-800)" : "var(--stone-300)")};
`;

export const StyledSeatNote = styled.small`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
`;

export const StyledLinkPair = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-sm);

  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: var(--stone-300);
  }
  a:hover {
    text-decoration-color: currentColor;
  }
`;

export const StyledMuted = styled.span`
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

// 오늘 운행 — 회차마다 한 줄: 방향 + 시각 + 상태 칩.
export const StyledTodayRuns = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const StyledTodayRun = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
`;

export const StyledBusFooter = styled.div`
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

// 정원 수정 창 — 저장은 됐고 경고만 남았을 때의 목록과 풀이 한 줄.
export const StyledWarningList = styled.ul`
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: var(--fs-sm);
  line-height: 1.5;

  li + li {
    margin-top: 4px;
  }
`;

export const StyledWarningNote = styled.p`
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
`;

// 대화상자 안 입력칸 묶음 — 공용 Dialog 본문은 칸 사이 간격이 없어 시안(칸 사이 16px)처럼 세로로 쌓는다.
export const StyledFormStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
`;
