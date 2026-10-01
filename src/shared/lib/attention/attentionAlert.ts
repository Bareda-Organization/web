// 놓치면 안 되는 일(비상 알림·승인 요청)을 다른 탭에 있어도 알아채게 하는 브라우저 알림. 소리는 내지 않는다(Ruling 700).
// 기본은 꺼짐이며 사용자가 켠 경우에만 동작한다 — 권한 요청도 켜는 조작 안에서만 나간다.
// 저장 키는 소리가 있던 때 이름 그대로 둔다 — 이미 켠 사람이 계속 켜진 채로 있게 한다.

const PREFERENCE_KEY = "attention-alert-enabled";

export const isAttentionAlertEnabled = (): boolean => {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) === "on";
  } catch {
    return false;
  }
};

export const setAttentionAlertEnabled = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, enabled ? "on" : "off");
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 이번 탭 동안만 유효하지 않게 된다 — 다음 방문에 다시 켜야 한다.
  }
};

// 브라우저 알림 권한 요청 — 사용자가 "알림 켜기" 를 누른 직후에만 부른다.
export const requestBrowserNotificationPermission = async (): Promise<void> => {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  await Notification.requestPermission();
};

// 켜져 있을 때만 브라우저 알림을 낸다. 꺼져 있으면 아무 것도 하지 않는다.
export const notifyAttention = (title: string, body: string): void => {
  if (!isAttentionAlertEnabled()) return;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
};
