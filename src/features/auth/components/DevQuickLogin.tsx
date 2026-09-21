"use client";

// 개발용 빠른 로그인 — 로그인 화면에서 시드 계정을 한 번에 넣고 제출까지 한다.
//
// **왜 있나.** 화면을 눈으로 확인하려면 매번 로그인해야 하는데, 브라우저 자동화로 아이디·비밀번호를
// 넣는 일이 번번이 실패한다(초점·입력 순서·렌더 시점). 2026-09-21 사용자 지시로 만든 우회로다.
// Flutter 쪽 짝은 `baraeda_ui/widgets/dev/dev_quick_login.dart`.
//
// ⚠ **운영 빌드에는 들어가지 않는다** — `process.env.NODE_ENV === "production"` 이면 `null` 을
// 돌려주고, Next.js 가 그 분기를 빌드 시점에 지워 번들에서도 사라진다. 비밀번호 상수는
// **로컬 Flyway 시드 전용**이다(demo·prod 는 SSM 값이라 다르다).

/** 로컬 시드(`V2__seed_data.sql`)가 심는 비밀번호 — 전 계정 공통. */
const SEED_PASSWORD = "password";

/** 관계자 웹이 받는 역할만 싣는다 — 학부모·기사는 이 콘솔에 로그인해도 되돌려보내진다. */
const ACCOUNTS: ReadonlyArray<{ label: string; loginId: string }> = [
  { label: "학원 관계자", loginId: "staffA" },
  { label: "관계자(타 학원)", loginId: "staffB" },
  { label: "메인 관리자", loginId: "sysadmin" },
  { label: "승인 대기", loginId: "staffPending" },
];

type Props = {
  /** 아이디·비밀번호를 받아 **제출까지** 한다 — 채우기만 하면 문제가 반쯤만 풀린다. */
  onPick: (loginId: string, password: string) => void;
  disabled?: boolean;
};

export const DevQuickLogin = ({ onPick, disabled }: Props) => {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div style={{ marginTop: 24, borderTop: "1px solid #ddd", paddingTop: 12 }}>
      <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>
        개발용 빠른 로그인 (운영 빌드에는 부재)
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {ACCOUNTS.map((a) => (
          <button
            key={a.loginId}
            type="button"
            data-testid={`dev-login-${a.loginId}`}
            disabled={disabled}
            onClick={() => onPick(a.loginId, SEED_PASSWORD)}
            style={{
              fontSize: 11,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #bbb",
              background: "#fff",
              cursor: "pointer",
              lineHeight: 1.4,
            }}
          >
            {a.label}
            <br />
            {a.loginId}
          </button>
        ))}
      </div>
    </div>
  );
};
