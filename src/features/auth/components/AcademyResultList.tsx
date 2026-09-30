import type { AcademySummaryResponseTypes } from "../types";
import { StyledResultButton, StyledResultItem, StyledResultList, StyledResultMeta } from "./SignupForm.styled";

// §2.1 학원 검색은 한 번에 20건까지만 준다 — 정확히 20건이면 잘렸을 수 있다.
export const ACADEMY_SEARCH_LIMIT = 20;

export const ACADEMY_SEARCH_ERROR = "학원 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.";

type AcademyResultListProps = {
  results: AcademySummaryResponseTypes[];
  selectedId?: string;
  onPick: (academy: AcademySummaryResponseTypes) => void;
};

// 가입 폼·재신청 화면이 같이 쓰는 학원 검색 결과 — 행마다 버튼이라 키보드로 고를 수 있다.
export const AcademyResultList = ({ results, selectedId, onPick }: AcademyResultListProps) => (
  <>
    <StyledResultList>
      {results.map((academy) => (
        <StyledResultItem key={academy.id}>
          <StyledResultButton type="button" $selected={selectedId === academy.id} aria-pressed={selectedId === academy.id} onClick={() => onPick(academy)}>
            {academy.name}
            <StyledResultMeta>
              {academy.region} · {academy.code}
            </StyledResultMeta>
          </StyledResultButton>
        </StyledResultItem>
      ))}
    </StyledResultList>
    {results.length >= ACADEMY_SEARCH_LIMIT ? (
      <StyledResultMeta>검색 결과가 {ACADEMY_SEARCH_LIMIT}건까지만 표시됩니다. 검색어를 더 좁혀 주세요.</StyledResultMeta>
    ) : null}
  </>
);
