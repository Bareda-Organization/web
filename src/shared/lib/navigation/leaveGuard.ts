// 저장 안 한 편집을 두고 앱 안에서 떠날 때 한 번 묻는다(2026-09-23 — 뒤로가기·로그아웃 버튼을 더하며).
//
// 브라우저의 `beforeunload` 는 창을 닫거나 새로 고칠 때만 불리고, Next.js 의 앱 안 이동(사이드바·뒤로·
// 로그아웃)에는 안 불린다. 편집 화면이 경고 문구를 걸어 두고, 앱 안에서 떠나는 쪽이 `confirmLeave()` 를 부른다.
// 한 번에 편집 화면은 하나라 값 하나로 충분하다.

let leaveWarning: string | null = null;

/** 편집 화면이 건다 — 저장했거나 화면을 벗어나면 `null` 로 푼다. */
export const setLeaveWarning = (message: string | null): void => {
  leaveWarning = message;
};

/** 떠나도 되면 `true` — 경고가 걸려 있으면 사용자에게 묻는다. */
export const confirmLeave = (): boolean => leaveWarning === null || window.confirm(leaveWarning);
