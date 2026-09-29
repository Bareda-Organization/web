import type { SignupRole } from "../types";

// 가입 요청의 역할을 화면에 보일 한글 이름 — 목록과 처리 대화상자가 같은 표를 쓴다.
export const SIGNUP_ROLE_LABEL: Record<SignupRole, string> = {
  parent: "학부모",
  student: "학생",
  driver: "기사",
  escort: "동승 매니저",
};
