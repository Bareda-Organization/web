import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunRosterDialog } from "./RunRosterDialog";
import { getRunRoster } from "../api";
import { ApiError } from "@/shared/lib/http";

vi.mock("../api", () => ({
  getRunRoster: vi.fn(),
}));

const mockGetRunRoster = vi.mocked(getRunRoster);

const student = (studentId: string, name: string) => ({
  studentId,
  name,
  photoUrl: null as string | null,
  studentPhone: null,
  guardianPhone: null,
  status: "waiting" as const,
});

// 전체 관제 [명단 보기] — 닫기 버튼이 없어 Esc 밖에 닫을 방법이 없었고, 명단이 길면(실측 1,422px · 화면 720px) 대화상자가
// 화면보다 길어져 닫기 버튼이 스크롤 아래로 밀렸다. 명단은 높이가 제한된 영역 안에서 스크롤하고 닫기는 그 밖(footer)에 둔다.
describe("RunRosterDialog — 닫기와 긴 명단", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("닫기 버튼을 누르면 onClose 를 부른다 — 명단 조회가 실패해도 닫을 수 있다", async () => {
    mockGetRunRoster.mockRejectedValue(new ApiError(500, "UNKNOWN", "명단 조회 중 오류가 발생했습니다"));
    const onClose = vi.fn();
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText("명단 조회 중 오류가 발생했습니다")).toBeInTheDocument());

    // 머리의 × 와 아래 [닫기] 둘 다 닫는다(R48 시안 `monitoring--roster`).
    const closers = screen.getAllByRole("button", { name: "닫기" });
    expect(closers).toHaveLength(2);
    fireEvent.click(closers[1]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("명단은 높이가 제한된 스크롤 영역 안에 있고, 닫기 버튼은 그 영역 밖에 있다", async () => {
    mockGetRunRoster.mockResolvedValue({
      stops: [{ stopId: "1", seq: 1, name: "강남역", students: Array.from({ length: 40 }, (_, i) => student(String(i), `학생${i}`)) }],
    });
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={vi.fn()} />);

    const scrollArea = await screen.findByRole("region", { name: "탑승 명단" });

    expect(within(scrollArea).getByText("학생39")).toBeInTheDocument();
    expect(within(scrollArea).queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "닫기" }).length).toBeGreaterThan(0);
    expect(scrollArea).toHaveStyle({ overflowY: "auto" });
    // 상한이 없으면 "none" 이라 NaN — 상한이 화면보다 작아야 닫기 버튼이 스크롤 없이 보인다.
    expect(parseFloat(getComputedStyle(scrollArea).maxHeight)).toBeLessThan(window.innerHeight);
  });
});

// R48 시안 `monitoring--roster` — 승하차지별 묶음 · 학생 / 학부모 연락처. 보호자가 없으면 번호 대신 –. 상태 막대와 건수는 Ruling 844 로 뺐다.
describe("RunRosterDialog — 묶음 · 연락처 · 상태 칩", () => {
  afterEach(() => vi.clearAllMocks());

  it("승하차지별 머리줄, 두 연락처 열, 학생별 상태 칩을 보인다", async () => {
    mockGetRunRoster.mockResolvedValue({
      stops: [
        {
          stopId: "1",
          seq: 1,
          name: "극동아파트 정문",
          students: [
            { ...student("1", "원하율"), status: "boarded" as const, studentPhone: "010-0000-3101", guardianPhone: "010-0000-4101" },
            { ...student("2", "한도윤"), status: "absent" as const, studentPhone: null, guardianPhone: "010-0000-4106" },
          ],
        },
        { stopId: "2", seq: 2, name: "삼익아파트 정문", students: [{ ...student("3", "송지아"), status: "no_show" as const, guardianPhone: null }] },
      ],
    });
    render(<RunRosterDialog runId="1" busNo="2호차" direction="등원" onClose={vi.fn()} />);

    expect(await screen.findByText("극동아파트 정문 · 2명")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "2호차 · 등원 탑승 명단" })).toBeInTheDocument();
    expect(screen.getByText("010-0000-3101")).toBeInTheDocument();
    expect(screen.getByText("010-0000-4106")).toBeInTheDocument();
    // 미등원은 회색(끝남 모양)이고 미승차는 위험이다(Ruling 811).
    expect(screen.getByText("미등원").closest("[data-tone]")).toHaveAttribute("data-tone", "off");
    expect(screen.getByText("미승차").closest("[data-tone]")).toHaveAttribute("data-tone", "bad");
  });
});

// Ruling 844 — 상태 막대 · 상태별 건수는 사양 근거가 없어 뺐다. 승하차지별 학생 목록과 학생별 상태 칩은 그대로다.
describe("RunRosterDialog — 상태 막대 · 건수 없음(Ruling 844)", () => {
  afterEach(() => vi.clearAllMocks());

  it("상태 막대(role=img)와 '탑승 완료 N · 미승차 N' 건수 줄이 없다", async () => {
    mockGetRunRoster.mockResolvedValue({
      stops: [{ stopId: "1", seq: 1, name: "강남역", students: [{ ...student("1", "원하율"), status: "boarded" as const }, { ...student("2", "한도윤"), status: "no_show" as const }] }],
    });
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={vi.fn()} />);

    expect(await screen.findByText("강남역 · 2명")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/탑승 완료 \d/)).not.toBeInTheDocument();
    expect(screen.getByText("미승차")).toBeInTheDocument();
  });
});

// Ruling 847 · O-06 — 관제 명단 학생 사진. 없거나 못 불러오면 이름 첫 글자.
describe("RunRosterDialog — 학생 사진(O-06)", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  const rosterWith = (...students: ReturnType<typeof student>[]) => ({ stops: [{ stopId: "1", seq: 1, name: "강남역", students }] });

  it("photoUrl 이 있으면 사진을 그리고, 없는 학생은 이름 첫 글자를 그린다", async () => {
    mockGetRunRoster.mockResolvedValue(rosterWith({ ...student("1", "원하율"), photoUrl: "https://cdn.example.com/p.jpg" }, student("2", "한도윤")));
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={vi.fn()} />);

    const photo = await screen.findByRole("img", { name: "원하율 사진" });
    expect(photo).toHaveAttribute("src", "https://cdn.example.com/p.jpg");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByText("한")).toBeInTheDocument();
    expect(screen.queryByText("원")).not.toBeInTheDocument();
  });

  it("사진을 못 불러오면(이미지 오류 · 토큰 요청 실패) 이름 첫 글자로 돌아간다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    mockGetRunRoster.mockResolvedValue(
      rosterWith({ ...student("1", "원하율"), photoUrl: "https://cdn.example.com/broken.jpg" }, { ...student("2", "한도윤"), photoUrl: "/api/v1/files/photos/b.jpg" }),
    );
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={vi.fn()} />);

    fireEvent.error(await screen.findByRole("img", { name: "원하율 사진" }));

    await waitFor(() => expect(screen.getByText("원")).toBeInTheDocument());
    expect(screen.getByText("한")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("하단 안내가 사진 표시와 대체 글자 규칙을 말한다", async () => {
    mockGetRunRoster.mockResolvedValue(rosterWith(student("1", "원하율")));
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={vi.fn()} />);

    expect(await screen.findByText(/사진이 없거나 불러오지 못한 학생은 이름 첫 글자/)).toBeInTheDocument();
  });
});
