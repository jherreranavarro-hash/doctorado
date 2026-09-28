"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError, setCsrfToken } from "./api";
import type { AuthenticatedUser, MeResponse } from "./types";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  refresh: () => Promise<AuthenticatedUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyMeResponse(me: MeResponse): AuthenticatedUser {
  setCsrfToken(me.csrfToken);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { csrfToken, ...user } = me;
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch<MeResponse>("/auth/me");
      const nextUser = applyMeResponse(me);
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCsrfToken(undefined);
        setUser(null);
        return null;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    setCsrfToken(undefined);
    setUser(null);
  }, []);

  useEffect(() => {
    apiFetch<MeResponse>("/auth/me")
      .then((me) => setUser(applyMeResponse(me)))
      .catch((err: unknown) => {
        if (!(err instanceof ApiError && err.status === 401)) throw err;
        setCsrfToken(undefined);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() debe usarse dentro de <AuthProvider>");
  return ctx;
}
