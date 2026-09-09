"use client";

// Emotion 은 렌더링 중에 스타일 태그를 동적으로 만드는데, App Router 의 서버 렌더링은
// 그 시점을 모른다. 이 레지스트리가 그 사이를 잇는다 — 렌더링 중 생성된 스타일을
// 모아 뒀다가 `useServerInsertedHTML` 로 스트리밍 응답의 <head> 에 끼워 넣는다.
// (Next.js 공식 App Router + Emotion 연동 패턴)
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";

type EmotionRegistryProps = {
  children: React.ReactNode;
};

export const EmotionRegistry = ({ children }: EmotionRegistryProps) => {
  const [{ cache, flush }] = useState(() => {
    const emotionCache = createCache({ key: "baraeda" });
    emotionCache.compat = true;

    const prevInsert = emotionCache.insert;
    const inserted: string[] = [];
    emotionCache.insert = (...args) => {
      const serialized = args[1];
      if (emotionCache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };

    const flushCache = () => {
      const prevInserted = inserted.slice();
      inserted.length = 0;
      return prevInserted;
    };

    return { cache: emotionCache, flush: flushCache };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }

    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }

    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
};
