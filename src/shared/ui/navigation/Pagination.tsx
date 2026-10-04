import type { HTMLAttributes } from "react";
import { Icon } from "../core/Icon";
import { StyledPageButton, StyledPagination, StyledPaginationControls, StyledPaginationPage, StyledPaginationSummary } from "./Pagination.styled";

export type PaginationProps = HTMLAttributes<HTMLElement> & {
  /** §1.8 — 0 기점 */
  page: number;
  /** §1.8 — 기본 20, 최대 100 */
  size: number;
  totalCount: number;
  /** §1.8 응답 봉투의 `has_next` — 마지막 페이지 판정을 totalCount 계산으로 다시 하지 않는다 */
  hasNext: boolean;
  onPageChange: (nextPage: number) => void;
  /** 조회가 실패했다 — 건수를 모르므로 "총 0건" 을 보이지 않는다 */
  hasError?: boolean;
};

// §1.8 페이징 규약 — 목록 화면 전부가 이 컴포넌트를 공유한다(학생·차량·매니저·
// 스케줄·알림 로그). 서버가 준 has_next 를 그대로 쓰고, 화면이 총 개수로 마지막
// 페이지를 다시 계산하지 않는다 — 그 계산이 size 를 잘못 가정하면 어긋난다.
export const Pagination = ({ page, size, totalCount, hasNext, onPageChange, hasError = false, ...rest }: PaginationProps) => {
  if (hasError && totalCount === 0) return null;

  const from = totalCount === 0 ? 0 : page * size + 1;
  const to = Math.min(totalCount, (page + 1) * size);

  return (
    <StyledPagination aria-label="페이지 이동" {...rest}>
      <StyledPaginationSummary>
        총 {totalCount}건 중 {from}-{to}
      </StyledPaginationSummary>
      <StyledPaginationControls>
        <StyledPageButton type="button" aria-label="이전" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
          <Icon name="chevron-left" size={16} />
        </StyledPageButton>
        <StyledPaginationPage aria-current="page" aria-label={`${page + 1} 페이지`}>
          {page + 1}
        </StyledPaginationPage>
        <StyledPageButton type="button" aria-label="다음" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          <Icon name="chevron-right" size={16} />
        </StyledPageButton>
      </StyledPaginationControls>
    </StyledPagination>
  );
};
