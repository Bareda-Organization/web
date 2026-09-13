// 네이버 지도 클라이언트 키를 읽는다 — `shared/lib/http/config.ts`·`shared/lib/ws/wsUrl.ts`
// 와 같은 `process.env.NEXT_PUBLIC_XXX` 관용구를 따른다. 키 값 자체는 로그·주석·
// 커밋에 절대 남기지 않는다(`.env.local`, git 미추적).
export const getNaverMapClientId = (): string | undefined => {
  return process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
};
