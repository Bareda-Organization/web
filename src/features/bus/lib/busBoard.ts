import type { BusItemResponseTypes } from "../types";

// 차량 관리 화면의 계산 — 서버가 준 목록(`today_runs[]` · `student_capacity`)에서 지표 4칸과 필터를 뽑는 순수 함수 모음.

export type BusStatusFilter = "" | "operable" | "inoperable";

export type BusSummary = {
  total: number;
  operable: number;
  inoperable: number;
  /** 학생 탑승 가능 합계 — 운행 가능 차량만(운행 불가 차량의 좌석은 오늘 쓸 수 없다) */
  studentSeats: number;
  /** 오늘 미취소 회차 수 */
  runCount: number;
  runningBusCount: number;
  /** 오늘 회차가 없는 차량의 호차 이름 */
  restingBusNos: string[];
};

export const summarizeBuses = (buses: BusItemResponseTypes[]): BusSummary => {
  const operable = buses.filter((bus) => bus.operable);
  return {
    total: buses.length,
    operable: operable.length,
    inoperable: buses.length - operable.length,
    studentSeats: operable.reduce((sum, bus) => sum + bus.studentCapacity, 0),
    runCount: buses.reduce((sum, bus) => sum + bus.todayRuns.length, 0),
    runningBusCount: buses.filter((bus) => bus.todayRuns.length > 0).length,
    restingBusNos: buses.filter((bus) => bus.todayRuns.length === 0).map((bus) => bus.busNo),
  };
};

export const filterBuses = (buses: BusItemResponseTypes[], filter: BusStatusFilter): BusItemResponseTypes[] =>
  filter === "" ? buses : buses.filter((bus) => bus.operable === (filter === "operable"));

// 좌석 구성 — 정원에서 학생 탑승 가능을 뺀 나머지가 기사 + 동승자 자리다(`student_capacity` = `capacity` − 기사 1 − 동승자 1, A-11).
export const seatSplit = (bus: Pick<BusItemResponseTypes, "capacity" | "studentCapacity">): { student: number; reserved: number } => ({
  student: bus.studentCapacity,
  reserved: Math.max(0, bus.capacity - bus.studentCapacity),
});
