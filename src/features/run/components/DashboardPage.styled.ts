import styled from "@emotion/styled";

export const StyledDashboardLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`;

export const StyledStatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
`;

// R15-T2 §8.23 목표 2 — 지도가 화면 상단에 가득차고, 그 우측에 버스 목록을 둔다.
// 3fr:1fr 로 나눠 지도가 대부분을 차지하면서도 목록이 항상 옆에 보이게 한다.
export const StyledMapTopRow = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 16px;
  align-items: stretch;
`;

export const StyledMapPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// F4 — 자리표시(점선 테두리)를 걷어내고 실제 `MapSurface` 를 담는 크기 지정 컨테이너로 바꾼다.
// R15-T2 — "화면 상단에 가득차게" 요구에 맞춰 160px → 480px 로 키운다.
export const StyledMapSurface = styled.div`
  height: 480px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
`;

export const StyledFallbackNotice = styled.p`
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;

export const StyledBusListPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  overflow-y: auto;
  max-height: 480px;
`;

export const StyledBusListEmpty = styled.p`
  color: var(--text-secondary);
  font-size: var(--fs-body-sm);
`;

export const StyledBusListItem = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid ${(props) => (props.$active ? "var(--nav-active-bg)" : "transparent")};
  background: ${(props) => (props.$active ? "var(--nav-active-bg)" : "transparent")};
  text-align: left;
  cursor: pointer;
`;

export const StyledBusListItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: var(--fw-bold);
`;

export const StyledBusListItemMeta = styled.span`
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
