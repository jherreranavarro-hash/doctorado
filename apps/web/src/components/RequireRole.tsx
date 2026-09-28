"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

export function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = Array.isArray(role) ? role : [role];
  const hasRole = (u: typeof user) => Boolean(u?.roles.some((r) => allowed.includes(r.roleKey)));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!hasRole(user)) {
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router]);

  if (loading || !user || !hasRole(user)) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-ink-suave">Cargando…</p>
      </main>
    );
  }

  return <>{children}</>;
}
