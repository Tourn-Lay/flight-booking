"use client";
import * as React from "react";
import { authService } from "@/services/auth";
import { tokenStorage } from "@/lib/storage";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: Parameters<typeof authService.register>[0]) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Restore the session from the stored token
  React.useEffect(() => {
    let active = true;
    if (!tokenStorage.getAccess()) {
      setLoading(false);
      return;
    }
    authService
      .profile()
      .then((u) => active && setUser(u))
      .catch(() => tokenStorage.clear())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("fb:session-expired", onExpired);
    return () => window.removeEventListener("fb:session-expired", onExpired);
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    tokenStorage.set(res.access, res.refresh);
    setUser(res.user);
    return res.user;
  }, []);

  const register = React.useCallback(async (payload: Parameters<typeof authService.register>[0]) => {
    const res = await authService.register(payload);
    tokenStorage.set(res.access, res.refresh);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = React.useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = React.useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
