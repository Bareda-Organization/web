import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { suggestStops } from "../api";
import type { StopSuggestionTypes } from "../types";
import { StopAddressSearch } from "./StopAddressSearch";

vi.mock("../api", () => ({ suggestStops: vi.fn() }));

const mockSuggest = vi.mocked(suggestStops);

const suggestion: StopSuggestionTypes = { lat: 37.3, lng: 127.3, displayName: "서울시 목동서로 1", nearby: [] };

const type = (value: string) => fireEvent.change(screen.getByLabelText("주소 검색"), { target: { value } });
const settle = () => act(() => vi.advanceTimersByTimeAsync(400));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("StopAddressSearch — F02-15", () => {
  it("후보를 고르면 고른 이름으로 지오코딩을 한 번 더 부르지 않는다", async () => {
    mockSuggest.mockResolvedValue([suggestion]);
    render(<StopAddressSearch onPick={vi.fn()} />);

    type("목동");
    await settle();
    expect(mockSuggest).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("option", { name: "서울시 목동서로 1" }));
    await settle();

    expect(mockSuggest).toHaveBeenCalledTimes(1);
  });

  it("고른 뒤 같은 칸에 새로 입력하면 다시 검색한다", async () => {
    mockSuggest.mockResolvedValue([suggestion]);
    render(<StopAddressSearch onPick={vi.fn()} />);

    type("목동");
    await settle();
    fireEvent.click(screen.getByRole("option", { name: "서울시 목동서로 1" }));
    await settle();
    type("신정역");
    await settle();

    expect(mockSuggest).toHaveBeenCalledTimes(2);
    expect(mockSuggest).toHaveBeenLastCalledWith("신정역");
  });

  it("두 글자 미만으로 줄이면 진행 중이던 요청의 늦은 응답이 나중에 옛 후보로 보이지 않는다", async () => {
    let resolveFirst!: (value: StopSuggestionTypes[]) => void;
    mockSuggest.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));
    render(<StopAddressSearch onPick={vi.fn()} />);

    type("신정");
    await settle();
    type("신");
    await act(async () => resolveFirst([suggestion]));
    type("신정");

    expect(screen.queryByRole("option", { name: "서울시 목동서로 1" })).not.toBeInTheDocument();
  });
});
