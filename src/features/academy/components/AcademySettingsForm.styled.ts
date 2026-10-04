import styled from "@emotion/styled";

export const StyledAcademySettingsLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  /* 위쪽은 PageHeader 가 26px 을 이미 준다 — 여기서 또 주면 시안보다 제목이 26px 내려간다 */
  padding: 0 24px 24px;
`;

// 왼쪽 설정 카드 · 오른쪽 읽기 전용 카드 둘.
export const StyledSettingsBoard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
  gap: var(--s4);
  align-items: start;

  & > div:last-of-type {
    display: flex;
    flex-direction: column;
    gap: var(--s4);
  }

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StyledSettingsSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  padding-bottom: var(--s4);

  h2 {
    margin: 0;
    font: var(--fw-bold) var(--fs-md) / 1.4 var(--font-sans);
  }
  p {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--text-secondary);
  }
`;

export const StyledPresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  span {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

export const StyledKvList = styled.dl`
  margin: 0;
  font-size: var(--fs-sm);

  & > div {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
    font-weight: var(--fw-medium);
    font-variant-numeric: tabular-nums;
  }
`;

// 저장 막대 — 변경 건수 · 되돌리기 · 저장을 카드 바닥에 둔다. 변경 중에는 노랑 면.
export const StyledSaveBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin: 0 -20px -20px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-sm);
  color: var(--text-secondary);

  & > span {
    margin-right: auto;
  }
  &[data-dirty] {
    background: var(--row-warn-bg);
    color: var(--t-move);
  }
`;
