import { SignupStatusPanel } from "@/features/auth";

// UF-X-02 승인 대기 · 거절. pending·rejected 계정은 AuthGateGuard 가 항상 이 경로로 보낸다.
export default function SignupStatusPage() {
  return <SignupStatusPanel />;
}
