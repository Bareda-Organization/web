"use client";

// 배포 시험 빌드에서만 — Ruling 877. 역할별 빠른 로그인 단추 2개를 그린다.
// 비밀번호 환경변수(`NEXT_PUBLIC_QUICK_LOGIN_PASSWORD`)가 비어 있으면 아무것도 그리지 않는다.
// 단추는 아이디·비밀번호를 넘길 뿐 인증을 건너뛰지 않는다 — 제출은 호출부의 기존 로그인 함수가 한다.

const ACCOUNTS: ReadonlyArray<{ label: string; loginId: string }> = [
  { label: "학원 관계자", loginId: "staffA" },
  { label: "메인 관리자", loginId: "sysadmin" },
];

type Props = {
  /** 아이디·비밀번호를 받아 제출까지 한다. */
  onPick: (loginId: string, password: string) => void;
  disabled?: boolean;
};

export const QuickLogin = ({ onPick, disabled }: Props) => {
  const password = process.env.NEXT_PUBLIC_QUICK_LOGIN_PASSWORD;
  if (!password) return null;

  return (
    <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {ACCOUNTS.map((account) => (
        <button
          key={account.loginId}
          type="button"
          data-testid={`quick-login-${account.loginId}`}
          disabled={disabled}
          onClick={() => onPick(account.loginId, password)}
          style={{ fontSize: 12, padding: "6px 10px", cursor: "pointer" }}
        >
          {account.label} · {account.loginId}
        </button>
      ))}
    </div>
  );
};
