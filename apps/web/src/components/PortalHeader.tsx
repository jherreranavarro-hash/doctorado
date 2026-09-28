"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/Button";

const ACCENTS: Record<string, string> = {
  estudiante: "border-b-4 border-azul2",
  docente: "border-b-4 border-gold",
  administrador: "border-b-4 border-garnet",
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

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className={`bg-paper2 px-4 py-3 flex items-center justify-between ${ACCENTS[variant]}`}>
      <Link href={homeHref} className="link-pill">
        <h1 className="text-lg font-bold text-navy-txt">{title}</h1>
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
