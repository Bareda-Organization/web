import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "./Pagination";

const props = { page: 0, size: 20, totalCount: 0, hasNext: false, onPageChange: () => {} };

describe("Pagination — 조회 실패", () => {
  it("정상이면 총 건수를 보여 준다", () => {
    render(<Pagination {...props} totalCount={35} />);
    expect(screen.getByText("총 35건 중 1-20")).toBeInTheDocument();
  });

  // B1 #11 — 조회 실패 때 "총 0건 중 0-0" 이 같이 떠 실제로 0건인 것처럼 읽혔다. 모르는 건수는 보여 주지 않는다.
  it("조회가 실패했으면 모르는 건수(총 0건)를 보여 주지 않는다", () => {
    render(<Pagination {...props} hasError />);
    expect(screen.queryByText(/총 0건/)).not.toBeInTheDocument();
  });
});
