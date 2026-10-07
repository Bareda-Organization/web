import styled from "@emotion/styled";

export const StyledResultList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 220px;
  overflow-y: auto;
`;

export const StyledResultItem = styled.li`
  list-style: none;
`;

// 결과 한 줄은 버튼이다 — 마우스 없이 Tab·Enter·Space 로도 고를 수 있다(F03-14).
export const StyledResultButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  text-align: left;
  border-radius: var(--radius-control);
  border: 1px solid ${({ $selected }) => ($selected ? "var(--border-strong)" : "var(--border-subtle)")};
  background: ${({ $selected }) => ($selected ? "var(--accent-primary-soft)" : "var(--surface-card)")};
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  font: var(--text-body);
  color: var(--text-primary);

  &:hover {
    border-color: var(--border-strong);
  }
`;

export const StyledResultMeta = styled.span`
  display: block;
  font: var(--text-caption);
  color: var(--text-secondary);
  margin-top: var(--space-1);
`;

export const StyledSelectedAcademy = styled.p`
  font: var(--text-body);
  color: var(--text-brand);
  margin: 0;
`;

// 제출 버튼 아래 — 아직 비어 있는 항목 이름(UF-X-01).
export const StyledMissingFields = styled.p`
  font: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
`;
