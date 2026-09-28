import type { ReactNode } from "react";
import { ChevronRightIcon } from "./icons";

const ICON_BOX: Record<"estudiante" | "docente" | "administrador", string> = {
  estudiante: "bg-azul2/15 text-azul2",
  docente: "bg-gold/20 text-garnet-d",
  administrador: "bg-garnet/15 text-garnet",
};

/** Fila de índice ("centro de ayuda" style): caja de ícono a la izquierda +
 * título/meta al centro + contenido libre abajo (progreso, badges) +
 * indicador de navegación a la derecha. Usada dentro de un <Link> por los
 * 3 portales para listar módulos / cohortes / programas. */
export function IndexCard({
  variant,
  icon,
  title,
  meta,
  trailing,
  children,
}: {
  variant: "estudiante" | "docente" | "administrador";
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="card p-4 sm:p-5 flex items-start gap-4 hover:shadow-[var(--shadow-hover)] hover:border-borde-fuerte hover:-translate-y-0.5">
      <div
        className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${ICON_BOX[variant]}`}
        aria-hidden
      >
        <span className="h-5 w-5 block">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-base font-bold text-navy-txt">{title}</h2>
          {trailing}
        </div>
        {meta ? <p className="text-sm text-ink-suave mt-0.5">{meta}</p> : null}
        {children}
      </div>
      <ChevronRightIcon className="shrink-0 h-5 w-5 text-ink-suave mt-2.5 hidden sm:block" />
    </div>
  );
}
