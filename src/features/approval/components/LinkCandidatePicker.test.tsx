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
