// 받침 유무로 조사를 고른다 — 이름을 문장에 끼워 넣는 곳("이수민을 퇴사 처리" · "새봄영어를 승인")에서 "을(를)" 같은 괄호 표기를 쓰지 않으려는 용도.
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

const hasFinalConsonant = (word: string): boolean => {
  const code = word.trim().charCodeAt(word.trim().length - 1);
  return code >= HANGUL_START && code <= HANGUL_END && (code - HANGUL_START) % JONGSEONG_COUNT !== 0;
};

/** 목적격 조사 — `민창민` → `을`, `새봄영어` → `를`. 한글이 아닌 끝글자(영문 · 숫자)는 `를` 로 둔다. */
export const objectParticle = (word: string): "을" | "를" => (hasFinalConsonant(word) ? "을" : "를");

/** 이름에 목적격 조사를 붙여 돌려준다 — `withObject("이수민")` → `이수민을`. */
export const withObject = (word: string): string => `${word}${objectParticle(word)}`;
