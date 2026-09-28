import type { HTMLAttributes } from "react";

/** Insignia de estado sobria (borde + texto del mismo color, fondo muy suave)
 * — reutilizada por dashboard, detalle de módulo, examen y tareas. No es un
 * componente compartido del portal (vive dentro de estudiante/_components a
 * propósito, ver boundaries del encargo). */
export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}
    />
  );
}
