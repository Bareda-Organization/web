import { Card, Skeleton, SkeletonGroup, SkeletonRow } from "@/shared/ui";
import { StyledCardBody, StyledGridThree, StyledGridTwo, StyledSkeletonGrid } from "./DashboardPage.styled";
import { StyledSkeletonMetricCell, StyledSkeletonMetricGrid, StyledSkeletonSummaryCard } from "./DashboardSkeleton.styled";

// 불러오는 중 뼈대 — 최종 화면과 같은 칸 배치(지표 6칸 · 3칸 카드 · 표 + 옆 카드)라 데이터가 와도 자리가 밀리지 않는다. 제목·필터·기간은 이미 아는 값이라 뼈대 밖에 둔다.
export const DashboardSkeleton = () => (
  <SkeletonGroup>
    <StyledSkeletonSummaryCard padding={0}>
      <StyledSkeletonMetricGrid>
        {Array.from({ length: 6 }, (_, index) => (
          <StyledSkeletonMetricCell key={index}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="value" width="50%" />
            <Skeleton variant="detail" width="90%" />
          </StyledSkeletonMetricCell>
        ))}
      </StyledSkeletonMetricGrid>
    </StyledSkeletonSummaryCard>
    <StyledGridThree>
      {[0, 1, 2].map((index) => (
        <Card key={index} padding={0}>
          <StyledCardBody>
            <StyledSkeletonGrid>
              <Skeleton variant="title" width="45%" />
              {index === 1 ? <Skeleton variant="chart" /> : [1, 2, 3, 4, 5].map((line) => <Skeleton key={line} variant="detail" width={`${95 - line * 8}%`} />)}
            </StyledSkeletonGrid>
          </StyledCardBody>
        </Card>
      ))}
    </StyledGridThree>
    <StyledGridTwo>
      <Card padding={0}>
        <StyledCardBody>
          <Skeleton variant="title" width="30%" />
        </StyledCardBody>
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonRow key={index}>
            <Skeleton variant="text" width={52} />
            <Skeleton variant="text" width={96} />
            <Skeleton variant="text" width={150} />
            <Skeleton variant="text" width={70} />
          </SkeletonRow>
        ))}
      </Card>
      <Card padding={0}>
        <StyledCardBody>
          <StyledSkeletonGrid>
            <Skeleton variant="title" width="40%" />
            {[1, 2, 3, 4, 5].map((line) => (
              <Skeleton key={line} variant="detail" width={`${95 - line * 9}%`} />
            ))}
          </StyledSkeletonGrid>
        </StyledCardBody>
      </Card>
    </StyledGridTwo>
  </SkeletonGroup>
);
