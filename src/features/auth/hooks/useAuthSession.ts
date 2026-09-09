import { useContext } from "react";
import { AuthSessionContext, type AuthSessionContextValue } from "../components/AuthSessionProvider";

export const useAuthSession = (): AuthSessionContextValue => {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession 은 AuthSessionProvider 안에서만 쓸 수 있다");
  }
  return context;
};
