import type { AccountRole } from "../types";

// 관계자 웹에서 쓸 수 있는 역할 — 나머지(학부모·학생·기사·동승자)는 앱 전용이다.
export const WEB_ROLES: readonly AccountRole[] = ["staff", "system_admin"];

export const isWebRole = (role: AccountRole): boolean => WEB_ROLES.includes(role);

export const APP_ONLY_ROLE_MESSAGE = "학부모·학생·매니저는 앱을 이용해 주세요";

// 웹 로그인이 앱 전용 계정이라 막혔다는 신호 — 로그인 화면이 안내 문구를 그리는 근거.
export class AppOnlyRoleError extends Error {
  constructor() {
    super(APP_ONLY_ROLE_MESSAGE);
    this.name = "AppOnlyRoleError";
  }
}
