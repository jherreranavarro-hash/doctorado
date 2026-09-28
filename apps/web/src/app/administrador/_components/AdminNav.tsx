"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/administrador", label: "Resumen" },
  { href: "/administrador/estudiantes", label: "Estudiantes" },
  { href: "/administrador/docentes", label: "Docentes" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-paper2 border-b border-borde px-4">
      <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto">
        {TABS.map((tab) => {
          const active =
            tab.href === "/administrador" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tap-target px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${
                active ? "border-garnet text-garnet" : "border-transparent text-ink-suave hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
