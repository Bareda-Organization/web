// 놓치면 안 되는 일(비상 알림·승인 요청)을 다른 탭에 있어도 알아채게 하는 소리·브라우저 알림.
// 기본은 꺼짐이며 사용자가 켠 경우에만 동작한다 — 권한 요청도 켜는 조작 안에서만 나간다.

const PREFERENCE_KEY = "attention-alert-enabled";
const TONE_FREQUENCY_HZ = 880;
const TONE_DURATION_S = 0.4;

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

const playTone = (): void => {
  if (typeof AudioContext === "undefined") return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  oscillator.frequency.value = TONE_FREQUENCY_HZ;
  oscillator.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + TONE_DURATION_S);
  oscillator.onended = () => void context.close();
};

// 켜져 있을 때만 소리와 브라우저 알림을 낸다. 꺼져 있으면 아무 것도 하지 않는다.
export const notifyAttention = (title: string, body: string): void => {
  if (!isAttentionAlertEnabled()) return;
  try {
    playTone();
  } catch {
    // 자동 재생 정책 등으로 소리가 막혀도 브라우저 알림은 시도한다.
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
};
