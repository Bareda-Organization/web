// features/auth 가 다루는 타입 전부 — API 응답은 `OOOResponseTypes` (`CONVENTIONS_REACT.md`).
// 서버는 snake_case(§1.1)를 쓰지만 이 파일의 타입은 앱 내부 관례대로 camelCase 다 —
// snake_case ↔ camelCase 변환은 `api/*.ts` 호출부가 경계에서 한 번만 한다.

export type AccountRole = "parent" | "student" | "driver" | "escort" | "staff" | "system_admin";

// 회원가입 화면(§2.2)이 고를 수 있는 값 — system_admin 은 내부 발급이라 가입 대상이 아니다.
export type SignupRole = Exclude<AccountRole, "system_admin">;

export type AccountStatus = "pending" | "active" | "rejected";

export type AcademySummaryResponseTypes = {
  id: string;
  name: string;
  region: string;
  code: string;
};

export type AcademySearchResponseTypes = {
  items: AcademySummaryResponseTypes[];
};

export type SignupRequestTypes = {
  role: SignupRole;
  loginId: string;
  password: string;
  name: string;
  phone: string;
  academyId: string;
};

export type SignupResponseTypes = {
  accountStatus: AccountStatus;
  requestedAt: string;
  approver: "staff" | "system_admin";
};

export type SignupStatusResponseTypes = {
  status: AccountStatus;
  academy: { name: string; region: string; code: string };
  requestedAt: string;
  rejectReason?: string;
  academyContact: string;
};

export type ReapplySignupResponseTypes = {
  status: AccountStatus;
  requestedAt: string;
};

export type AcademyRefResponseTypes = {
  id: string;
  name: string;
} | null;

export type LoginResponseTypes = {
  accessToken: string;
  role: AccountRole;
  status: AccountStatus;
  accountId: string;
  academy: AcademyRefResponseTypes;
};

export type MeResponseTypes = {
  accountId: string;
  loginId: string;
  name: string;
  phone: string;
  role: AccountRole;
  status: AccountStatus;
  academy?: AcademyRefResponseTypes;
  studentId?: string;
  managerId?: string;
  managerRole?: string;
  linkedStudentCount?: number;
};

export type ChangePasswordRequestTypes = {
  currentPassword: string;
  newPassword: string;
};

export type RecoverAccountRequestTypes = {
  type: "login_id" | "password";
  phone: string;
  verificationCode?: string;
};

export type DevicePlatform = "android" | "ios" | "web";

export type DeviceRegisterRequestTypes = {
  token: string;
  platform: DevicePlatform;
  deviceId: string;
  appVersion?: string;
};

export type DeviceRegisterResponseTypes = {
  deviceId: string;
  registeredAt: string;
};

// AuthSessionProvider 가 들고 있는 세션 스냅샷. 로그인·새로고침 재발급·`/me` 조회가
// 전부 이 형태로 합쳐진다 — 화면은 이 타입 하나만 보고 판단한다.
export type AuthSession = {
  accountId: string;
  role: AccountRole;
  status: AccountStatus;
  academy: AcademyRefResponseTypes;
};

// POST /staff/accounts/{accountId}/password-reset (§5.22) 응답 — 임시 비밀번호는 1회 반환.
export type AccountPasswordResetResponseTypes = {
  accountId: string;
  loginId: string;
  temporaryPassword: string;
};
