import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinkCandidateTypes } from "../types";
import { LinkCandidatePicker } from "./LinkCandidatePicker";

// F02-04 — 검색을 제출했을 때 앞선 요청의 응답이 더 늦게 도착해도 후보 목록이 덮이면 안 된다.
describe("LinkCandidatePicker — F02-04 늦게 온 옛 응답", () => {
  it("처음 조회 응답이 검색 응답보다 늦게 와도 후보에는 검색 결과가 남는다", async () => {
    let resolveFirst!: (value: LinkCandidateTypes[]) => void;
    const search = vi
      .fn<(query?: string) => Promise<LinkCandidateTypes[]>>()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce([{ id: "2", name: "검색된후보" }]);
    render(<LinkCandidatePicker search={search} selectedIds={[]} onChange={vi.fn()} multiple placeholder="검색" />);

    fireEvent.change(screen.getByPlaceholderText("검색"), { target: { value: "검색" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText("검색된후보");
    await act(async () => resolveFirst([{ id: "1", name: "옛후보" }]));

    expect(screen.getByText("검색된후보")).toBeInTheDocument();
    expect(screen.queryByText("옛후보")).not.toBeInTheDocument();
  });
});

// B1 #14 — 신청자는 자기 이름으로 가입했으니 관계자가 같은 이름을 다시 치지 않게 검색어를 채워 두고 그 이름으로 먼저 찾는다.
describe("LinkCandidatePicker — B1 #14 신청자 이름으로 미리 검색", () => {
  it("initialQuery 가 있으면 입력칸에 채우고 그 검색어로 처음 조회한다", async () => {
    const search = vi.fn<(query?: string) => Promise<LinkCandidateTypes[]>>().mockResolvedValue([{ id: "1", name: "김민수" }]);
    render(<LinkCandidatePicker search={search} selectedIds={[]} onChange={vi.fn()} multiple placeholder="검색" initialQuery="김민수" />);

    await screen.findByText("김민수");
    expect(search).toHaveBeenCalledWith("김민수");
    expect(screen.getByPlaceholderText("검색")).toHaveValue("김민수");
  });
});

// 신청자 이름이 등록된 이름과 다르면(별명·오타) 빈 목록만 남지 않게, 이름으로 못 찾으면 전체 후보로 돌아가 검색어를 비운다.
describe("LinkCandidatePicker — B1 #14 신청자 이름으로 못 찾을 때", () => {
  it("이름으로 찾은 결과가 없으면 검색어를 비우고 전체 후보를 보여 준다", async () => {
    const search = vi
      .fn<(query?: string) => Promise<LinkCandidateTypes[]>>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "9", name: "다른이름" }]);
    render(<LinkCandidatePicker search={search} selectedIds={[]} onChange={vi.fn()} multiple placeholder="검색" initialQuery="별명" />);

    await screen.findByText("다른이름");
    expect(search).toHaveBeenNthCalledWith(1, "별명");
    expect(search).toHaveBeenNthCalledWith(2, undefined);
    expect(screen.getByPlaceholderText("검색")).toHaveValue("");
  });
});

// B1 #14 — 이미 다른 계정에 연결된 후보는 고를 수 없게 보이고 이유를 적는다(승인 확정 뒤 409 로 알게 하지 않는다).
describe("LinkCandidatePicker — B1 #14 이미 연결된 후보", () => {
  it("disabledReason 이 있는 후보는 체크할 수 없고 그 이유가 보인다", async () => {
    const onChange = vi.fn();
    const search = vi
      .fn<(query?: string) => Promise<LinkCandidateTypes[]>>()
      .mockResolvedValue([
        { id: "1", name: "김민수", detail: "1반", disabledReason: "이미 가입한 학생" },
        { id: "2", name: "김민수", detail: "2반" },
      ]);
    render(<LinkCandidatePicker search={search} selectedIds={[]} onChange={onChange} multiple placeholder="검색" />);

    await screen.findAllByText("김민수");
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes[0]).toBeDisabled();
    expect(boxes[1]).not.toBeDisabled();
    expect(screen.getByText(/이미 가입한 학생/)).toBeInTheDocument();
  });
});
