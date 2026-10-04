import styled from "@emotion/styled";

// 후보 목록 — 위아래 선만 있는 목록(OptionList) 안에서 한 줄에 라디오(또는 체크) · 이름 · 설명 · 연결 가능 여부를 둔다.
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
