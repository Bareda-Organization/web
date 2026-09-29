"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Checkbox, SearchField } from "@/shared/ui";
import type { LinkCandidateTypes } from "../types";
import { StyledCandidateList } from "./LinkCandidatePicker.styled";

type LinkCandidatePickerProps = {
  /** 이름 검색으로 후보를 가져온다 — 검색어가 없으면 처음 몇 명을 보여준다. */
  search: (query?: string) => Promise<LinkCandidateTypes[]>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** true 면 여러 명(다자녀), false 면 한 명만 고른다. */
  multiple: boolean;
  placeholder: string;
};

// 이름 검색 → 고르는 목록 — 가입 승인이 ID 를 직접 입력받던 자리를 대신한다.
export const LinkCandidatePicker = ({ search, selectedIds, onChange, multiple, placeholder }: LinkCandidatePickerProps) => {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<LinkCandidateTypes[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (q?: string) => {
      try {
        setCandidates(await search(q));
        setError(null);
      } catch (cause) {
        setCandidates([]);
        setError(cause instanceof ApiError ? cause.message : "목록을 불러오지 못했습니다");
      }
    },
    [search],
  );

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const toggle = (id: string, checked: boolean) => {
    if (!multiple) return onChange(checked ? [id] : []);
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((selected) => selected !== id));
  };

  return (
    <>
      <SearchField value={query} onChange={(event) => setQuery(event.target.value)} onSubmit={load} placeholder={placeholder} />
      {error ? <AlertBanner tone="missed" title={error} /> : null}
      <StyledCandidateList>
        {candidates.length === 0 && !error ? <p>검색 결과가 없습니다</p> : null}
        {candidates.map((candidate) => (
          <Checkbox
            key={candidate.id}
            label={candidate.name}
            sublabel={candidate.detail}
            checked={selectedIds.includes(candidate.id)}
            onChange={(event) => toggle(candidate.id, event.target.checked)}
          />
        ))}
      </StyledCandidateList>
    </>
  );
};
