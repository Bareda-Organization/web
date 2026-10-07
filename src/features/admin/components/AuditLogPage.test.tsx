import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogPage } from "./AuditLogPage";
import { getAllAcademies, getAuditActors, getAuditLogs, getLoginHistory } from "../api";

// §6.13 감사·접속 이력 — 기본 조회 조건은 비어 있다(Ruling 844). 첫 조회는 from · to 를 보내지 않고(서버가 최근 30일을 준다 · Ruling 632),
// 사용자가 시작일 · 종료일을 직접 고르고 조회할 때만 그 값이 요청에 실린다. 이 파일은 그 요청 조건과 표의 표기를 본다.
vi.mock("../api", () => ({
  getAuditLogs: vi.fn(),
  getLoginHistory: vi.fn(),
  getAllAcademies: vi.fn(),
  getAuditActors: vi.fn(),
}));

const mockGetAuditLogs = vi.mocked(getAuditLogs);
const mockGetLoginHistory = vi.mocked(getLoginHistory);
const mockGetAllAcademies = vi.mocked(getAllAcademies);
const mockGetAuditActors = vi.mocked(getAuditActors);

beforeEach(() => {
  mockGetAllAcademies.mockResolvedValue([]);
  mockGetAuditActors.mockResolvedValue([]);
});

const emptyResponse = { items: [], page: 1, size: 20, totalCount: 0, hasNext: false };

describe("AuditLogPage — 기본 조회 조건은 비어 있다(Ruling 844)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("첫 조회 요청에 from · to 가 없다(서버가 최근 30일을 준다 — Ruling 632)", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));
    const request = mockGetAuditLogs.mock.calls[0]?.[0];
    expect(request?.from).toBeUndefined();
    expect(request?.to).toBeUndefined();
  });

  it("시작일 · 종료일 칸은 비어 있고 기간 칩(오늘 · 7일 · 30일 · 직접 입력)은 없다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    expect(screen.getByLabelText("시작일")).toHaveValue("");
    expect(screen.getByLabelText("종료일")).toHaveValue("");
    for (const name of ["오늘", "7일", "30일", "직접 입력"]) {
      expect(screen.queryByRole("tab", { name })).not.toBeInTheDocument();
    }
  });

  it("시작일을 직접 고르고 조회하면 그 값이 요청에 실린다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);
    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ from: "2026-09-01" })));
  });

  // R46-FIXCONN Ruling 632 — 서버는 from 을 안 주면 to(없으면 지금)로부터 30일 전부터만 돌려준다. 시작일을 비운다고 전체 기간이
  // 아니므로 화면이 그렇게 안내해야 하고, 시작일을 비우는 버튼도 "전체 기간" 이라 부르면 거짓이다.
  it("시작일 칸에 '비우면 최근 30일' 안내가 있고, 두 이력 탭 모두에서 보인다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetLoginHistory.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    expect(screen.getByText(/비우면 종료일.*30일/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "접속 이력" }));

    expect(screen.getByText(/비우면 종료일.*30일/)).toBeInTheDocument();
  });

  it("접속 이력 탭으로 전환하면 getLoginHistory 를 호출한다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetLoginHistory.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("tab", { name: "접속 이력" }));

    await waitFor(() => expect(mockGetLoginHistory).toHaveBeenCalled());
  });
});

// R32-W9 — 감사·접속 이력의 시각이 서버의 ISO 원문으로 보였다.
describe("AuditLogPage — 시각 표기(R32-W9)", () => {
  afterEach(() => vi.clearAllMocks());

  it("감사 이력 시각을 ISO 원문이 아니라 한국 시간으로 보여준다", async () => {
    mockGetAuditLogs.mockResolvedValue({
      ...emptyResponse,
      items: [{ auditId: "1", occurredAt: "2026-09-12T08:00:00Z", actor: "관리자", action: "login", targetType: "account", targetId: "3", detail: null }],
      totalCount: 1,
    } as never);
    render(<AuditLogPage />);

    expect(await screen.findByText("9/12 17:00")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-12T/)).not.toBeInTheDocument();
  });
});

// Ruling 394 — block_event 는 차단 행과 해제 행 양쪽에 붙어 화면이 "차단·해제" 로만 쓸 수 있었다.
describe("AuditLogPage — 차단/해제 구분(Ruling 394)", () => {
  afterEach(() => vi.clearAllMocks());

  it("접속 이력 표가 차단 행과 해제 행을 다른 문구로 보여준다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetLoginHistory.mockResolvedValue({
      ...emptyResponse,
      items: [
        { accountId: "5", loginId: "unblocked", result: null, ip: "-", occurredAt: "2026-09-12T08:05:00Z", blockEvent: true, blockAction: "unblock" },
        { accountId: "5", loginId: "blocked", result: null, ip: "-", occurredAt: "2026-09-12T08:00:00Z", blockEvent: true, blockAction: "block" },
      ],
      totalCount: 2,
    } as never);
    render(<AuditLogPage />);
    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("tab", { name: "접속 이력" }));

    expect(await screen.findByText("차단")).toBeInTheDocument();
    expect(screen.getByText("해제")).toBeInTheDocument();
    expect(screen.queryByText("차단·해제")).not.toBeInTheDocument();
  });
});

// Ruling 846 ② · 847 — 해제 행에 해제한 관리자 이름. 서버가 안 주면(null · 키 없음) 표시가 없다.
describe("AuditLogPage — 해제 행의 해제한 관리자(Ruling 846)", () => {
  afterEach(() => vi.clearAllMocks());

  const unblockRow = (patch: Record<string, unknown>) => ({
    accountId: "5",
    loginId: "unblocked",
    result: null,
    ip: null,
    occurredAt: "2026-09-12T08:05:00Z",
    blockEvent: true,
    blockAction: "unblock",
    unblockedByName: null,
    ...patch,
  });

  it("해제 행에 해제한 관리자 이름이 보인다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetLoginHistory.mockResolvedValue({ ...emptyResponse, items: [unblockRow({ unblockedByName: "관리자김" })], totalCount: 1 } as never);
    render(<AuditLogPage />);
    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("tab", { name: "접속 이력" }));

    expect(await screen.findByText(/관리자김/)).toBeInTheDocument();
    expect(screen.getByText("해제")).toBeInTheDocument();
  });

  it("이름이 null 이면 해제 칩만 있고 이름 문구가 없다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetLoginHistory.mockResolvedValue({ ...emptyResponse, items: [unblockRow({})], totalCount: 1 } as never);
    render(<AuditLogPage />);
    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("tab", { name: "접속 이력" }));

    expect(await screen.findByText("해제")).toBeInTheDocument();
    expect(screen.queryByText(/처리$/)).not.toBeInTheDocument();
  });
});

// R46 감사 화면(Ruling 446·447) — 숫자 ID 입력을 학원 선택 · 이름으로 행위자 찾기 · 동작 필터로 바꿨다.
describe("AuditLogPage — 학원 선택 · 행위자 찾기 · 동작 필터(R46)", () => {
  afterEach(() => vi.clearAllMocks());

  const academy = { id: "7", code: "A7", name: "바래다학원", region: "서울", staffCount: 1, userCount: 3, status: "active" } as never;

  it("학원을 목록에서 고르고 조회하면 academyId 가 요청에 실린다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetAllAcademies.mockResolvedValue([academy]);
    render(<AuditLogPage />);
    await screen.findByRole("option", { name: /바래다학원/ });

    fireEvent.change(screen.getByLabelText("학원"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ academyId: "7" })));
  });

  it("이름으로 행위자를 찾아 고르고 조회하면 accountId 가 요청에 실린다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetAuditActors.mockResolvedValue([
      { accountId: "55", name: "김관계", loginId: "kim_staff", role: "staff", academyName: "바래다학원" },
    ]);
    render(<AuditLogPage />);

    fireEvent.change(screen.getByPlaceholderText("이름 또는 아이디"), { target: { value: "김관" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByRole("option", { name: /김관계/ });
    expect(mockGetAuditActors).toHaveBeenCalledWith("김관");

    fireEvent.change(screen.getByLabelText("행위자"), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ accountId: "55" })));
  });

  it("동작(수정)을 고르고 조회하면 action 이 요청에 실린다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    fireEvent.click(screen.getByRole("tab", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => expect(mockGetAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ action: "update" })));
  });

  it("접속 이력 탭에는 동작 필터가 없다", async () => {
    mockGetAuditLogs.mockResolvedValue(emptyResponse);
    mockGetLoginHistory.mockResolvedValue(emptyResponse);
    render(<AuditLogPage />);

    fireEvent.click(screen.getByRole("tab", { name: "접속 이력" }));

    await waitFor(() => expect(mockGetLoginHistory).toHaveBeenCalled());
    expect(screen.queryByRole("tab", { name: "수정" })).not.toBeInTheDocument();
  });
});

// R48 Ruling 809 — 감사 로그에 행위자 이름 · 동작 구별(강제 확정 등) · 접속 IP 가 실린다. 개인정보 조회가 아닌 운영 조작은 대상에 한글 문구로 덧붙는다.
describe("AuditLogPage — 행위자 이름 · 대상 · IP(Ruling 809)", () => {
  afterEach(() => vi.clearAllMocks());

  const auditItem = (patch: Record<string, unknown>) => ({
    actor: "staffA",
    actorName: "박지현",
    detailAction: null,
    ip: "211.234.10.21",
    action: "read",
    targetType: "student",
    targetId: "39",
    academyName: "하늘수학",
    occurredAt: "2026-09-12T08:00:00Z",
    ...patch,
  });

  it("행위자는 이름 아래 아이디, 대상은 한글 종류와 #id, 강제 확정은 괄호 문구, IP 는 별도 칸이다", async () => {
    mockGetAuditLogs.mockResolvedValue({
      ...emptyResponse,
      items: [auditItem({}), auditItem({ actor: "sysadmin", actorName: "관리자", action: "update", targetType: "run", targetId: "66", detailAction: "run.force_confirm", ip: "121.168.3.17" })],
      totalCount: 2,
    } as never);
    render(<AuditLogPage />);

    expect(await screen.findByText("박지현")).toBeInTheDocument();
    expect(screen.getByText("staffA")).toBeInTheDocument();
    expect(screen.getByText("학생 #39")).toBeInTheDocument();
    expect(screen.getByText("회차 #66 (강제 확정)")).toBeInTheDocument();
    expect(screen.getByText("211.234.10.21")).toBeInTheDocument();
    expect(screen.getByText("121.168.3.17")).toBeInTheDocument();
  });

  it("서버가 새 필드를 안 주면(null) 행위자는 아이디만, IP 는 –", async () => {
    mockGetAuditLogs.mockResolvedValue({ ...emptyResponse, items: [auditItem({ actorName: null, ip: null })], totalCount: 1 } as never);
    render(<AuditLogPage />);

    expect(await screen.findByText("staffA")).toBeInTheDocument();
    expect(screen.queryByText("박지현")).not.toBeInTheDocument();
    expect(screen.getAllByText("–").length).toBeGreaterThan(0);
  });
});
