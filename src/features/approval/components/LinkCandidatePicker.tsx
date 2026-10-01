"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** 처음 채워 둘 검색어 — 가입 신청자 이름처럼 이미 아는 값. 있으면 그 이름으로 처음 조회한다. */
  initialQuery?: string;
};

// 이름 검색 → 고르는 목록 — 가입 승인이 ID 를 직접 입력받던 자리를 대신한다.
export const LinkCandidatePicker = ({ search, selectedIds, onChange, multiple, placeholder, initialQuery }: LinkCandidatePickerProps) => {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [candidates, setCandidates] = useState<LinkCandidateTypes[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 요청마다 번호를 매겨 마지막 요청의 응답만 화면에 반영한다 — 늦게 온 옛 검색 결과가 새 후보 목록을 덮지 않게 한다(F02-04).
  const requestSeq = useRef(0);

  const load = useCallback(
    async (q?: string) => {
      const seq = ++requestSeq.current;
      try {
        const found = await search(q);
        if (seq !== requestSeq.current) return -1;
        setCandidates(found);
        setError(null);
        return found.length;
      } catch (cause) {
        if (seq !== requestSeq.current) return -1;
        setCandidates([]);
        setError(cause instanceof ApiError ? cause.message : "목록을 불러오지 못했습니다");
        return -1;
      }
    },
    [search],
  );

  useEffect(() => {
    (async () => {
      const found = await load(initialQuery || undefined);
      // 신청자 이름으로 못 찾으면(등록된 이름과 다른 경우) 빈 목록만 남기지 않고 전체 후보로 돌아간다.
      if (initialQuery && found === 0) {
        setQuery("");
        await load();
      }
    })();
    // initialQuery 는 처음 한 번만 쓴다 — 관계자가 검색어를 고친 뒤 이 값이 바뀌어도 다시 조회하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            sublabel={[candidate.detail, candidate.disabledReason].filter(Boolean).join(" · ") || undefined}
            checked={selectedIds.includes(candidate.id)}
            disabled={candidate.disabledReason !== undefined}
            onChange={(event) => toggle(candidate.id, event.target.checked)}
          />
        ))}
      </StyledCandidateList>
    </>
  );
};
