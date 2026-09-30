"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { Icon } from "@/shared/ui";
import { suggestStops } from "../api";
import type { StopSuggestionTypes } from "../types";
import {
  StyledSearchInput,
  StyledSearchStatus,
  StyledSearchWrap,
  StyledSuggestion,
  StyledSuggestionAddress,
  StyledSuggestionList,
  StyledSuggestionPlace,
} from "./StopAddressSearch.styled";

// 입력을 멈춘 뒤 이만큼 기다렸다 부른다 — 한 글자마다 부르면 지오코딩 호출이 글자 수만큼 나간다.
const SUGGEST_DELAY_MS = 300;
// 한 글자로는 후보가 전국에 흩어져 쓸모가 없다.
const SUGGEST_MIN_LENGTH = 2;

type StopAddressSearchProps = {
  onPick: (suggestion: StopSuggestionTypes) => void;
};

/**
 * 주소 자동완성(2026-09-23 사용자 지시 — 주소를 끝까지 치지 않아도 비슷한 주소를 알려 달라).
 *
 * <p>입력을 멈추면 후보를 부르고, 목록은 마우스로도 키보드(↑↓·Enter·Esc)로도 고른다. 늦게 온 응답이
 * 새 입력의 결과를 덮지 않게 요청마다 번호를 매겨 마지막 것만 받는다.
 */
export const StopAddressSearch = ({ onPick }: StopAddressSearchProps) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<StopSuggestionTypes[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  // 후보를 고르며 입력칸을 고른 이름으로 채우는 변경은 검색어가 아니다 — 그 변경으로 검색이 또 나가지 않게 한다.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      ++requestSeq.current;
      return;
    }
    const trimmed = query.trim();
    // 최소 길이 미만으로 줄여도 번호를 올려, 이미 나간 요청의 늦은 응답이 결과를 채우지 못하게 한다.
    const seq = ++requestSeq.current;
    if (trimmed.length < SUGGEST_MIN_LENGTH) return;
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const result = await suggestStops(trimmed);
        if (seq !== requestSeq.current) return;
        setItems(result);
        setActive(result.length > 0 ? 0 : -1);
        setStatus(result.length > 0 ? "idle" : "empty");
      } catch (cause) {
        if (seq !== requestSeq.current) return;
        setItems([]);
        setStatus("error");
        setError(cause instanceof ApiError ? cause.message : "주소 후보를 불러오지 못했습니다");
      }
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = (suggestion: StopSuggestionTypes) => {
    setOpen(false);
    const nextQuery = suggestion.placeName ?? suggestion.displayName;
    // 값이 그대로면 effect 가 안 돌아 표시가 남으므로, 실제로 바뀔 때만 건너뛴다.
    if (nextQuery !== query) skipNextSearch.current = true;
    setQuery(nextQuery);
    onPick(suggestion);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && items.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === "ArrowUp" && items.length > 0) {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && items[active]) {
      event.preventDefault();
      pick(items[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= SUGGEST_MIN_LENGTH;

  return (
    <StyledSearchWrap>
      <Icon name="search" size={16} />
      <StyledSearchInput
        aria-label="주소 검색"
        role="combobox"
        aria-expanded={showList && items.length > 0}
        aria-controls="stop-address-suggestions"
        aria-autocomplete="list"
        placeholder="장소 이름이나 주소 (예: 신정역, 목동동로 257)"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (event.target.value.trim().length < SUGGEST_MIN_LENGTH) {
            setItems([]);
            setStatus("idle");
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
      />
      {showList ? (
        <StyledSuggestionList id="stop-address-suggestions" role="listbox">
          {items.map((item, index) => (
            <StyledSuggestion
              key={`${item.placeName ?? ""}-${item.displayName}-${item.lat}-${item.lng}`}
              role="option"
              aria-selected={index === active}
              $active={index === active}
              // 누르는 순간 입력칸 초점이 빠지며 목록이 닫히지 않게 — 선택은 click 이 한다.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(item)}
            >
              {item.placeName ? (
                <>
                  <StyledSuggestionPlace>{item.placeName}</StyledSuggestionPlace>
                  <StyledSuggestionAddress>{item.displayName}</StyledSuggestionAddress>
                </>
              ) : (
                item.displayName
              )}
            </StyledSuggestion>
          ))}
          {status === "loading" ? <StyledSearchStatus>찾는 중…</StyledSearchStatus> : null}
          {status === "empty" ? (
            <StyledSearchStatus>후보가 없습니다 — 도로명과 번지를 조금 더 적어 보세요</StyledSearchStatus>
          ) : null}
          {status === "error" ? <StyledSearchStatus $tone="error">{error}</StyledSearchStatus> : null}
        </StyledSuggestionList>
      ) : null}
    </StyledSearchWrap>
  );
};
