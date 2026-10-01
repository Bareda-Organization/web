import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getManagers } from "../api";
import { ManagerList } from "./ManagerList";

vi.mock("../api", () => ({ getManagers: vi.fn() }));
vi.mock("@/features/auth", () => ({ AccountPasswordResetDialog: () => null }));

const mockGetManagers = vi.mocked(getManagers);

// B1 #8 — 매니저를 등록해도 앱에서 가입 승인을 받기 전에는 앱에 들어올 수 없다. 목록이 그 상태를 말해 줘야 한다.
describe("ManagerList — 앱 계정 연결 상태", () => {
  afterEach(() => vi.clearAllMocks());

  it("계정이 연결된 매니저는 '연결됨', 아닌 매니저는 '앱 가입 전' 으로 보인다", async () => {
    mockGetManagers.mockResolvedValue({
      items: [
        { id: "1", name: "김기사", phone: "010-1111-1111", role: "driver", workHours: null, accountId: "101" },
        { id: "2", name: "이동승", phone: "010-2222-2222", role: "escort", workHours: null, accountId: null },
      ],
      page: 0, size: 20, totalCount: 2, hasNext: false,
    });
    render(<ManagerList />);

    const linkedRow = (await screen.findByText("김기사")).closest("tr")!;
    const unlinkedRow = screen.getByText("이동승").closest("tr")!;
    expect(within(linkedRow).getByText("연결됨")).toBeInTheDocument();
    expect(within(unlinkedRow).getByText("앱 가입 전")).toBeInTheDocument();
  });
});
