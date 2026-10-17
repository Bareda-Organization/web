import styled from "@emotion/styled";
import { css } from "@emotion/react";

// 후보 목록 — 위아래 선만 있는 목록(`StyledOptionList`) 안에서 한 줄에 라디오(또는 체크) · 이름 · 설명 · 연결 가능 여부를 둔다.
export const StyledCandidateList = styled.div`
  max-height: 260px;
  overflow-y: auto;

  & > p {
    margin: 0;
    padding: 8px 0;
    font-size: var(--fs-sm);
    color: var(--text-secondary);
  }
`;

export const StyledCandidateLabel = styled.label<{ $disabled: boolean }>`
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 10px;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  color: ${({ $disabled }) => ($disabled ? "var(--text-secondary)" : "var(--text-primary)")};

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--primary);
  }
  span {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  b {
    font-weight: var(--fw-bold);
  }
  small {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
`;

// 후보 목록 — 카드 안의 카드로 읽히던 흰 상자 대신 위아래 선만 둔다.
export const StyledOptionList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);

  & > li + li {
    border-top: 1px solid var(--border-subtle);
  }
`;

// 선택된 항목은 3px 왼쪽 막대 대신 연한 면 + 안쪽 둘레선
export const StyledOptionListItem = styled.li<{ $picked: boolean }>`
  padding: 10px var(--s3);
  ${({ $picked }) =>
    $picked
      ? css`
          background: var(--selected-bg);
          box-shadow: inset 0 0 0 1.5px var(--selected-edge);
        `
      : null}

`;
