// `R18-C2` — §5.5(ChangeApprovalDetail)·§5.15(RunWaypointPanel) 가 둘 다 "노선 전체 소요(분)
// 전/후·증감 부호" 를 같은 형태("32분 → 38분 (+6분)")로 보여준다(Ruling 318). 값이 없을 때
// 왜 없는지는 화면마다 이유가 달라(결정된 건 vs 아직 미리보기 전) 여기서 다루지 않는다 — 호출부가
// null 을 걸러낸 뒤에만 부른다.
export const formatDurationDelta = (beforeMin: number, afterMin: number): string => {
  const delta = afterMin - beforeMin;
  const sign = delta >= 0 ? "+" : "";
  return `${beforeMin}분 → ${afterMin}분 (${sign}${delta}분)`;
};
