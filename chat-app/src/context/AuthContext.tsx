import { createContext, useContext, type ReactNode } from "react";
import { useAuth, type AuthUser } from "../hooks/useAuth";
import type { Status } from "../lib/types";

// El valor del contexto es el resultado completo del hook useAuth.
type AuthContextValue = AuthUser & {
  setStatus: (status: Status) => void;
  signOut: () => Promise<{ error: unknown } | void>;
  refreshProfile: (userId: string) => Promise<AuthUser["profile"]>;
};

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth() as AuthContextValue;
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAppAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAppAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
