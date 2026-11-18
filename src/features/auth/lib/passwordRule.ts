// 새 비밀번호를 사용자가 직접 정하는 화면(가입 · 비밀번호 변경)의 최소 길이 — 8자 이상, 구성 규칙은 없다(Ruling 938 C).
// 서버도 같은 기준으로 422 를 내며, 로그인은 길이를 보지 않아 기존 계정이 그대로 들어온다.
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_TOO_SHORT_MESSAGE = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`;

export const isPasswordTooShort = (password: string): boolean => password.length < PASSWORD_MIN_LENGTH;
