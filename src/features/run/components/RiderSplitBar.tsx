import type { RiderSplit } from "../lib/runBoard";
import { StyledRiderBar, StyledRiderLegend } from "./DashboardPage.styled";

type RiderSplitBarProps = {
  split: RiderSplit;
  /** 막대 길이의 기준 인원 — 보통 split 합. 비면 막대는 빈 회색 */
  total: number;
  thin?: boolean;
};

const KINDS = [
  { kind: "boarded", label: "탑승 완료" },
  { kind: "noShow", label: "미승차" },
  { kind: "absent", label: "미등원" },
  { kind: "waiting", label: "대기" },
] as const;

// 학생 4분류 누적 막대 — 색 + 모양(미등원은 빗금) + 글자(aria-label · 범례)로 말한다. 대기는 막대의 남은 회색이라 칸을 따로 그리지 않는다.
export const RiderSplitBar = ({ split, total, thin }: RiderSplitBarProps) => {
  const label = KINDS.map(({ kind, label: name }) => `${name} ${split[kind]}명`).join(" · ");
  return (
    <StyledRiderBar role="img" aria-label={label} $thin={thin}>
      {KINDS.filter(({ kind }) => kind !== "waiting" && split[kind] > 0 && total > 0).map(({ kind }) => (
        <span key={kind} data-kind={kind} style={{ width: `${(split[kind] / total) * 100}%` }} />
      ))}
    </StyledRiderBar>
  );
};

// 범례 — 0명인 분류는 접는다(전체 막대의 범례만 4종을 늘 보여 준다).
export const RiderSplitLegend = ({ split, showZero = false }: { split: RiderSplit; showZero?: boolean }) => (
  <StyledRiderLegend>
    {KINDS.filter(({ kind }) => showZero || split[kind] > 0).map(({ kind, label }) => (
      <li key={kind} data-kind={kind}>
        {label} {split[kind]}
      </li>
    ))}
  </StyledRiderLegend>
);
