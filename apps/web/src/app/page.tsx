"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { portalForRole } from "@/lib/portal";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <main className="relative flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-navy-txt mb-2">Portal de Doctorados</h1>
        <p className="text-ink-suave mb-8">
          Doctorado en Psicología · Doctorado en Psicología, Salud y Calidad de Vida
        </p>

        <Card className="flex flex-col gap-3">
          {loading ? (
            <p className="text-ink-suave">Cargando…</p>
          ) : user ? (
            <>
              <p className="text-ink">
                Sesión activa: <strong>{user.email}</strong>
              </p>
              <Link href={portalForRole(user.roles[0]?.roleKey)} className="tap-target">
                <Button className="w-full">Ir a mi portal</Button>
              </Link>
            </>
          ) : (
            <Link href="/login" className="tap-target">
              <Button className="w-full">Iniciar sesión</Button>
            </Link>
          )}
        </Card>
      </div>
    </main>
  );
}
