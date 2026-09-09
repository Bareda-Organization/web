import { LoginForm } from "@/features/auth";

// UF-X-03 로그인. 자동 로그인(새로고침 후 세션 유지)은 AuthSessionProvider 의 부트스트랩이 담당한다.
export default function LoginPage() {
  return <LoginForm />;
}
