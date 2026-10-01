// 새 학원이 어디까지 설정했는지 — 대시보드 시작 체크리스트의 입력.
export type SetupProgressResponseTypes = {
  busCount: number;
  managerCount: number;
  studentCount: number;
  routeCount: number;
  scheduleCount: number;
  // 차량·요일·방향이 같은 활성 노선이 없는 활성 스케줄 수(앞의 100건 기준).
  schedulesWithoutRoute: number;
};
