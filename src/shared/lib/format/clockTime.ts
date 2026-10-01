// `R20-B2` — 이 앱에서 사람에게 보여주는 시각은 전부 이 함수 하나를 거친다. 초·밀리초·
// 날짜를 버리고 "시:분"만 남긴다(사용자 지시 — "시간은 전체 소요시간·출발시간·도착시간만
// 표기해달라"는 그 화면의 시간 표기 전체에 대한 것이었다). 자리마다 따로 포맷하면 다음
// 사람이 하나만 고친다 — `durationDelta.ts`(R18-C 산출물) 옆에 둔다.
//
// 입력이 "이미 짧은 시각 문자열"(예: "08:10")이면 `Date` 파싱이 실패(Invalid Date)하므로
// 원본을 그대로 돌려준다 — 실제 백엔드는 `timestamptz` 를 전체 ISO 로 주지만, 시험
// 픽스처나 앞으로 백엔드가 짧은 형태로 바꾸는 경우까지 함께 견딘다.
// 표시 시간대는 브라우저(PC) 설정과 무관하게 한국 시간이다(`dateTime.ts` 의 `formatDateTime` 과 같은 규칙).
// `hourCycle: "h23"` — `hour12: false` 는 옛 규칙에서 자정을 `24:05` 로 낼 수 있다.
const SEOUL_TIME = { timeZone: "Asia/Seoul", hourCycle: "h23" } as const;

// 오프셋이 없는 `YYYY-MM-DDTHH:mm[:ss[.fff]]` 는 `formatDateTime` 과 같이 한국 시간 벽시계로 읽는다 —
// `new Date()` 에 그대로 넘기면 PC 시간대로 읽혀 UTC 인 GitHub Actions 에서 `08:00` 이 `17:00` 으로 나온다(R46-CIFIX).
// 한국은 서머타임이 없어 `+09:00` 고정이 정확하다.
const OFFSET_LESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const parseSeoulAware = (raw: string): Date => new Date(OFFSET_LESS_DATE_TIME.test(raw) ? `${raw}+09:00` : raw);

export const formatClockTime = (raw: string): string => {
  const parsed = parseSeoulAware(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleTimeString("ko-KR", { ...SEOUL_TIME, hour: "2-digit", minute: "2-digit" });
};

// R21-B — `formatClockTime` 과 이 함수는 용도가 다르다. `formatClockTime` 은 위 자바독이
// 못박은 "화면 전체 시간 표기" 기본값(시:분)이고, 이 함수는 **운행 출발·도착 시각만**
// 초 단위까지 보여 달라는 별도 사용자 지시(docs/archive/rounds/be-rounds-r15-r21.md §8.34 목표 B3, "몇시, 몇분, 초")를 따른다 —
// 기존 시:분 표기(승인 화면 등)를 이걸로 바꾸지 않는다.
export const formatClockTimeWithSeconds = (raw: string): string => {
  const parsed = parseSeoulAware(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleTimeString("ko-KR", { ...SEOUL_TIME, hour: "2-digit", minute: "2-digit", second: "2-digit" });
};
