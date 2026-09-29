import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RosterTable } from "./RosterTable";

type Row = { id: string; name: string };
const columns = [{ key: "name", label: "이름" }];

// R32-W10 — 목록 13곳이 0건이면 머리글만 남았고, 행은 키보드로 열 수 없었다.
describe("RosterTable — 빈 목록과 키보드", () => {
  it("행이 0건이면 머리글 아래에 빈 목록 문구를 보여 준다", () => {
    render(<RosterTable<Row> columns={columns} rows={[]} />);
    expect(screen.getByText("표시할 내용이 없습니다")).toBeInTheDocument();
  });

  it("빈 목록 문구는 화면이 정할 수 있다", () => {
    render(<RosterTable<Row> columns={columns} rows={[]} emptyMessage="등록된 차량이 없습니다" />);
    expect(screen.getByText("등록된 차량이 없습니다")).toBeInTheDocument();
  });

  it("행이 있으면 빈 목록 문구를 내지 않는다", () => {
    render(<RosterTable<Row> columns={columns} rows={[{ id: "1", name: "김철수" }]} />);
    expect(screen.queryByText("표시할 내용이 없습니다")).not.toBeInTheDocument();
  });

  it("클릭으로 여는 행은 키보드 초점을 받고 Enter·Space 로 열린다", () => {
    const onRowClick = vi.fn();
    render(<RosterTable<Row> columns={columns} rows={[{ id: "1", name: "김철수" }]} onRowClick={onRowClick} />);

    const row = screen.getByText("김철수").closest("tr")!;
    expect(row).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });

    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("행 안의 버튼에서 누른 Enter 는 행 열기를 또 일으키지 않는다", () => {
    const onRowClick = vi.fn();
    const withButton = [{ key: "name", label: "이름", render: () => <button type="button">처리</button> }];
    render(<RosterTable<Row> columns={withButton} rows={[{ id: "1", name: "김철수" }]} onRowClick={onRowClick} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "처리" }), { key: "Enter" });

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("클릭 동작이 없는 행에는 초점을 주지 않는다", () => {
    render(<RosterTable<Row> columns={columns} rows={[{ id: "1", name: "김철수" }]} />);
    expect(screen.getByText("김철수").closest("tr")).not.toHaveAttribute("tabindex");
  });
});
