"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { portalForRole } from "@/lib/portal";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const me = await refresh();
      router.push(portalForRole(me?.roles[0]?.roleKey));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
      <Card className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-navy-txt mb-1">Portal de Doctorados</h1>
        <p className="text-sm text-ink-suave mb-4">Inicia sesión con la cuenta que te entregó el programa.</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Correo"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormField
            label="Contraseña"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-peligro text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
        <p className="mt-4 text-xs text-ink-suave">
          Las cuentas de estudiante y docente son creadas por el administrador del programa —
          no hay registro público en esta plataforma.
        </p>
      </Card>
    </main>
  );
}
