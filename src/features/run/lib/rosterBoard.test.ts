import { describe, expect, it } from "vitest";
import type { RosterItemResponseTypes } from "../types";
import { filterRoster, rosterCounts, rosterForStop, stopPassage } from "./rosterBoard";

const row = (patch: Partial<RosterItemResponseTypes>): RosterItemResponseTypes => ({
  studentId: "1",
  name: "학생",
  className: "기본반",
  stopName: "정문",
  stopId: null,
  stopSeq: null,
  transferId: null,
  guardianPhone: null,
  change: null,
  status: "waiting",
  note: null,
  ...patch,
});

describe("rosterForStop — 명단과 노선을 id 로 잇는다(Ruling 811)", () => {
  const stops = [
    { stopId: "s1", name: "정문" },
    { stopId: "s2", name: "정문" }, // 같은 이름의 다른 승하차지
  ];
  const roster = [
    row({ studentId: "a", name: "가", stopId: "s1" }),
    row({ studentId: "b", name: "나", stopId: "s2" }),
    row({ studentId: "c", name: "다", stopId: "s2" }),
  ];

  it("같은 이름의 승하차지가 둘이어도 고른 id 의 학생만 나온다", () => {
    expect(rosterForStop(roster, stops, "s2").map((item) => item.name)).toEqual(["나", "다"]);
    expect(rosterForStop(roster, stops, "s1").map((item) => item.name)).toEqual(["가"]);
  });

  it("stop_id 가 없는 행(옛 서버 · 확정 전 예정 명단)은 이름으로 짝을 맞춘다", () => {
    const legacy = [row({ studentId: "x", name: "엑스", stopId: null, stopName: "후문" })];
    expect(rosterForStop(legacy, [{ stopId: "s9", name: "후문" }], "s9").map((item) => item.name)).toEqual(["엑스"]);
  });

  it("고른 승하차지가 없으면 빈 목록", () => {
    expect(rosterForStop(roster, stops, null)).toEqual([]);
  });
});

describe("rosterCounts · filterRoster — 상태 칩 건수와 필터", () => {
  const roster = [
    row({ studentId: "1", status: "boarded" }),
    row({ studentId: "2", status: "alighted" }),
    row({ studentId: "3", status: "no_show" }),
    row({ studentId: "4", status: "absent" }),
    row({ studentId: "5", status: "waiting", change: "added", transferId: "31" }),
    row({ studentId: "6", status: "waiting", change: "added" }),
    row({ studentId: "7", status: "waiting" }),
  ];

  it("탑승 완료는 하차 완료까지 합치고, 이동 대기는 transferId 가 있는 행이다", () => {
    expect(rosterCounts(roster)).toEqual({ all: 7, no_show: 1, absent: 1, waiting: 3, boarded: 2, added: 2, transfer: 1 });
  });

  it("상태 · 정차지 · 이름 조건을 함께 건다", () => {
    expect(filterRoster(roster, { status: "waiting", stopKey: null, query: "" }).map((item) => item.studentId)).toEqual(["5", "6", "7"]);
    expect(filterRoster(roster, { status: "all", stopKey: null, query: "" })).toHaveLength(7);
    expect(filterRoster([row({ name: "이아안" }), row({ name: "천하준" })], { status: "all", stopKey: null, query: "아안" })).toHaveLength(1);
  });
});

describe("stopPassage — 지난 · 현재 · 다음 정차지", () => {
  const stops = [
    { stopId: "a", name: "A" },
    { stopId: "b", name: "B" },
    { stopId: "c", name: "C" },
    { stopId: "d", name: "D" },
  ];
  it("현재 정차지 앞은 통과, 현재·다음은 그 이름으로, 뒤는 표시 없음", () => {
    expect(stops.map((stop) => stopPassage(stops, stop.stopId, "B", "C"))).toEqual(["passed", "current", "next", null]);
  });
  it("현재 정차지를 모르면 아무 표시도 하지 않는다", () => {
    expect(stops.map((stop) => stopPassage(stops, stop.stopId, null, null))).toEqual([null, null, null, null]);
  });
});
