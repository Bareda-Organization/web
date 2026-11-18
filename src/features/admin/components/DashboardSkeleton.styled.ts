import styled from "@emotion/styled";
import { Card } from "@/shared/ui";

export const StyledSkeletonSummaryCard = styled(Card)`
  margin-bottom: 16px;
`;

export const StyledSkeletonMetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
`;

export const StyledSkeletonMetricCell = styled.div`
  display: grid;
  gap: 8px;
  padding: 16px 20px;
`;
