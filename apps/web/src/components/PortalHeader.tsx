"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/Button";

const ACCENTS: Record<string, { border: string; badge: string; label: string }> = {
  estudiante: { border: "border-b-[3px] border-azul2", badge: "bg-azul2", label: "Estudiante" },
  docente: { border: "border-b-[3px] border-gold", badge: "bg-gold", label: "Docente" },
  administrador: { border: "border-b-[3px] border-garnet", badge: "bg-garnet", label: "Administrador" },
};

export function PortalHeader({
  homeHref,
  title,
  variant,
}: {
  homeHref: string;
  title: string;
  variant: "estudiante" | "docente" | "administrador";
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const accent = ACCENTS[variant];

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header
      className={`sticky top-0 z-10 bg-paper2 px-4 py-3 flex items-center justify-between shadow-sm ${accent.border}`}
    >
      <Link href={homeHref} className="link-pill flex items-center gap-2.5">
        <span
          className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-paper text-sm font-bold ${accent.badge}`}
          aria-hidden
        >
          {accent.label[0]}
        </span>
        <div className="flex flex-col leading-tight">
          <h1 className="text-lg font-bold text-navy-txt">{title}</h1>
          <span className="hidden sm:inline text-xs text-ink-suave font-medium">
            Portal de Doctorados
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        {user ? <span className="hidden sm:inline text-sm text-ink-suave">{user.email}</span> : null}
        <Button variant="secondary" onClick={onLogout}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
