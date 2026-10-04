import styled from "@emotion/styled";

// 초기화 영향 표 — 항목 이름 + 설명.
export const StyledResetKvList = styled.dl`
  margin: 12px 0;
  font-size: var(--fs-sm);

  & > div {
    display: grid;
    grid-template-columns: 112px 1fr;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
  }
`;
