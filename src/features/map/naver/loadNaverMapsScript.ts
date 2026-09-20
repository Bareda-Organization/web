"use client";

// 네이버 지도 웹 JS SDK v3 스크립트 적재를 앱 전체에서 한 번만 수행한다. 여러
// `MapSurface` 가 순차로 마운트돼도(페이지 전환마다 다시 마운트된다) 같은
// `<script>` 태그가 중복으로 실리지 않도록 모듈 단위로 약속(Promise)을 캐시한다 —
// `shared/hooks/useRealtimeChannel.ts` 의 모듈 단위 공유 상태와 같은 관용구다.
//
// URL 파라미터 `ncpKeyId` — 공식 문서(`https://navermaps.github.io/maps.js.ncp/`)
// 예제 스크립트 태그를 직접 받아 확인했다(보고서 §1). 폐기된 옛 파라미터
// `ncpClientId` 가 아니다.
const NAVER_MAPS_SCRIPT_SRC = "https://oapi.map.naver.com/openapi/v3/maps.js";

type NaverAuthFailureCallback = () => void;

declare global {
  interface Window {
    naver?: typeof naver;
    // 네이버 지도 v3 SDK 가 인증에 실패하면 이 전역 함수를 찾아 **인자 없이** 호출한다
    // (`oapi.map.naver.com/openapi/v3/maps.js` 를 직접 받아 실측 — 보고서 §1).
    // 구글 지도의 `gm_authFailure` 와 같은 자리이지만 에러 코드·예외 객체를 전혀
    // 넘기지 않는다 — "인증에 실패했다"는 신호만 온다.
    navermap_authFailure?: NaverAuthFailureCallback;
  }
}

let scriptPromise: Promise<void> | null = null;
const authFailureListeners = new Set<NaverAuthFailureCallback>();

const installAuthFailureHook = (): void => {
  window.navermap_authFailure = () => {
    for (const listener of authFailureListeners) listener();
  };
};

// 인증 실패를 구독한다 — `MapSurface` 의 `onAuthFailed` 가 이 함수로 등록된다.
export const onNaverAuthFailure = (listener: NaverAuthFailureCallback): (() => void) => {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
};

export const loadNaverMapsScript = (clientId: string): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("네이버 지도 SDK 는 브라우저에서만 실행된다"));
  }
  if (window.naver?.maps) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }
  installAuthFailureHook();
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${NAVER_MAPS_SCRIPT_SRC}?ncpKeyId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("네이버 지도 SDK 스크립트를 불러오지 못했다"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};
