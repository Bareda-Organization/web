import styled from "@emotion/styled";

// 검색 아이콘이 입력칸 안 왼쪽에 앉는다 — 공용 Input 과 같은 높이·테두리·초점 규칙을 따른다.
export const StyledSearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  color: var(--text-tertiary);

  & > svg {
    position: absolute;
    left: 13px;
    pointer-events: none;
  }
`;

export const StyledSearchInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 14px 0 38px;
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  font: var(--fw-regular) var(--fs-body-sm) / 1 var(--font-sans);
  outline: none;
  transition: var(--transition-control);

  &:focus {
    border-color: var(--focus-ring);
    box-shadow: var(--focus-shadow);
  }
`;

// 입력칸 바로 아래에 떠서 아래 양식을 밀어내지 않는다.
export const StyledSuggestionList = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  max-height: 240px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  list-style: none;
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-raised);
`;

export const StyledSuggestion = styled.li<{ $active: boolean }>`
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  font: var(--fw-regular) var(--fs-body-sm) / 1.4 var(--font-sans);
  color: var(--text-primary);
  background: ${({ $active }) => ($active ? "var(--surface-mist)" : "transparent")};
  cursor: pointer;
  overflow-wrap: anywhere;

  &:hover {
    background: var(--surface-mist);
  }
`;

export const StyledSuggestionPlace = styled.span`
  display: block;
  font-weight: var(--fw-bold);
`;

export const StyledSuggestionAddress = styled.span`
  display: block;
  color: var(--text-secondary);
  font-size: var(--fs-micro);
`;

export const StyledSearchStatus = styled.li<{ $tone?: "error" }>`
  padding: 9px 10px;
  font: var(--fw-regular) var(--fs-micro) / 1.5 var(--font-sans);
  color: ${({ $tone }) => ($tone === "error" ? "var(--status-missed)" : "var(--text-tertiary)")};
`;
