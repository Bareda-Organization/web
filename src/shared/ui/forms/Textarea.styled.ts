import styled from "@emotion/styled";

// 글자 수·안내를 label 안에 넣으면 필드 이름이 "메모0 / 200" 이 된다 — 바깥 div 로 두고 label 은 htmlFor 로 잇는다.
export const StyledWrap = styled.div`
  display: grid;
  gap: var(--s2);
  align-content: start;
`;

export const StyledLabel = styled.label`
  font: var(--fw-medium) var(--fs-sm) / 1.4 var(--font-sans);
  color: var(--text-primary);
`;

export const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 8px 12px;
  resize: vertical;
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--text-secondary);
  border-radius: var(--radius-control);
  font: var(--fw-regular) var(--fs-md) / 1.5 var(--font-sans);
  transition:
    border-color var(--dur-ui) var(--ease-out),
    box-shadow var(--dur-ui) var(--ease-out);

  &::placeholder {
    color: var(--text-secondary);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      border-color: var(--text-primary);
    }
  }

  &:focus {
    outline: 2px solid var(--focus-ring);
    outline-offset: 0;
    border-color: var(--focus-ring);
  }

  &:disabled {
    background: var(--surface-fill);
    color: var(--text-secondary);
    border-style: dashed;
    border-color: var(--border-default);
    cursor: not-allowed;
  }
`;

// 글자 수(0 / 200)와 안내 문구(예: 학생 이름·연락처는 적지 마세요)가 한 줄에 이어진다
export const StyledHintRow = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0 6px;
  font: var(--fw-regular) var(--fs-xs) / 1.5 var(--font-sans);
  color: var(--text-secondary);
`;

export const StyledCounter = styled.span`
  font-variant-numeric: tabular-nums;
`;

export const StyledHint = styled.span`
  text-wrap: pretty;

  &::before {
    content: "·";
    margin-right: 6px;
  }
`;

// 글자 수가 없는 칸의 안내는 앞에 점을 달지 않는다
export const StyledHintAlone = styled.span`
  text-wrap: pretty;
`;
