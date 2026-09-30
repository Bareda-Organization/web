// 계정 역할(§2.2)의 화면 표기 — 사용자 화면에 `parent`·`staff` 같은 영문 원문을 내지 않는다.
const ROLE_LABEL: Record<string, string> = {
  parent: "학부모",
  student: "학생",
  driver: "기사",
  escort: "동승자",
  staff: "학원 관계자",
  system_admin: "메인 관리자",
};

// 사전에 없는 역할(신규 값)은 원문을 그대로 낸다 — 비워 두면 누구인지 알 수 없다.
export const formatRole = (role: string): string => ROLE_LABEL[role] ?? role;
