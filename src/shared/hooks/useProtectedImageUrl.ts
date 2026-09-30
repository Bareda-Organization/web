import { useEffect, useState } from "react";
import { API_PATH_PREFIX, apiFetchBlob } from "../lib/http";

// Ruling 377 — 학생 사진(`GET /files/photos/{fileName}`)은 로그인 토큰이 있어야 받는다.
// `<img src>` 는 Authorization 헤더를 못 실으므로 http 클라이언트로 받아 객체 URL 로 바꿔 돌려준다.
// - 상대 경로(`/api/v1/files/...`) → 토큰 fetch. 베이스 URL 이 이미 `/api/v1` 을 품으므로 앞머리는 떼고 붙인다.
// - 절대 URL(옛 공개 주소) → 그대로 돌려준다.
// - 실패(401·403·404·네트워크)·주소 없음 → undefined, 호출부가 "사진 없음" 대체 표시를 그린다.
export const useProtectedImageUrl = (photoUrl: string | null | undefined): string | undefined => {
  const isRelative = !!photoUrl && photoUrl.startsWith("/");
  const [fetched, setFetched] = useState<{ source: string; objectUrl: string } | undefined>(undefined);

  useEffect(() => {
    if (!photoUrl || !isRelative) {
      return;
    }
    const controller = new AbortController();
    let objectUrl: string | undefined;
    const path = photoUrl.startsWith(API_PATH_PREFIX) ? photoUrl.slice(API_PATH_PREFIX.length) : photoUrl;
    apiFetchBlob(path, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setFetched({ source: photoUrl, objectUrl });
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoUrl, isRelative]);

  if (!photoUrl) {
    return undefined;
  }
  if (!isRelative) {
    return photoUrl;
  }
  // 주소가 바뀐 직후 옛 주소의 사진이 잠깐 보이지 않게 출처를 맞춰 본다.
  return fetched?.source === photoUrl ? fetched.objectUrl : undefined;
};
